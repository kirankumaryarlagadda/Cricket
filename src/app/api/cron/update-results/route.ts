import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TEAMS } from '@/lib/teams';

// Map full team names from CricAPI to our abbreviations
function mapTeamName(apiName: string): string | null {
  const normalized = apiName.toLowerCase().trim();
  for (const [abbr, team] of Object.entries(TEAMS)) {
    if (
      normalized.includes(team.name.toLowerCase()) ||
      normalized.includes(abbr.toLowerCase())
    ) {
      return abbr;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const summary: string[] = [];

    // 1. Auto-update status to 'live' for matches whose match_date has passed
    const now = new Date().toISOString();
    const { data: shouldBeLive } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('status', 'upcoming')
      .lte('match_date', now);

    if (shouldBeLive && shouldBeLive.length > 0) {
      const ids = shouldBeLive.map((m: any) => m.id);
      await supabaseAdmin
        .from('matches')
        .update({ status: 'live' })
        .in('id', ids);

      summary.push(`Updated ${ids.length} match(es) to live status`);
    }

    // 2. Check CricketData API for completed matches
    const apiKey = process.env.CRICKETDATA_API_KEY;
    if (!apiKey) {
      summary.push('No CRICKETDATA_API_KEY configured, skipping external results check');
      return NextResponse.json({ summary });
    }

    // Get all currently live matches from our DB
    const { data: liveMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('status', 'live');

    if (!liveMatches || liveMatches.length === 0) {
      summary.push('No live matches to check');
      return NextResponse.json({ summary });
    }

    // Fetch current matches from CricketData.org
    const apiResponse = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`
    );
    const apiData = await apiResponse.json();

    if (apiData.status !== 'success' || !apiData.data) {
      summary.push('CricAPI returned no data or error: ' + (apiData.message || 'unknown'));
      return NextResponse.json({ summary });
    }

    // Filter for IPL matches that are complete
    const iplCompleted = apiData.data.filter(
      (m: any) =>
        m.matchType === 't20' &&
        (m.name?.includes('IPL') || m.series?.includes('Indian Premier League')) &&
        m.matchEnded === true
    );

    for (const apiMatch of iplCompleted) {
      for (const dbMatch of liveMatches) {
        const team1Full = TEAMS[dbMatch.team1]?.name?.toLowerCase() || '';
        const team2Full = TEAMS[dbMatch.team2]?.name?.toLowerCase() || '';
        const apiTeams = (apiMatch.teams || []).map((t: string) => t.toLowerCase());

        const teamsMatch =
          apiTeams.some((t: string) => t.includes(team1Full) || team1Full.includes(t)) &&
          apiTeams.some((t: string) => t.includes(team2Full) || team2Full.includes(t));

        if (teamsMatch && apiMatch.matchWinner) {
          const winnerAbbr = mapTeamName(apiMatch.matchWinner);
          if (winnerAbbr && (winnerAbbr === dbMatch.team1 || winnerAbbr === dbMatch.team2)) {
            await supabaseAdmin
              .from('matches')
              .update({ status: 'completed', winner: winnerAbbr })
              .eq('id', dbMatch.id);

            summary.push(`Match #${dbMatch.match_number}: ${dbMatch.team1} vs ${dbMatch.team2} — winner: ${winnerAbbr}`);
          }
        }
      }
    }

    if (summary.length === 0) {
      summary.push('No updates needed');
    }

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}