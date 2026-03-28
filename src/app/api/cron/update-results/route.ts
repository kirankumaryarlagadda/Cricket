import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TEAMS } from '@/lib/teams';

const IPL_2026_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';

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

// Extract match number from API name like "Royal Challengers Bengaluru vs Sunrisers Hyderabad, 1st Match, Indian Premier League 2026"
function extractMatchNumber(name: string): number | null {
  const match = name.match(/(\d+)(?:st|nd|rd|th)\s+Match/i);
  return match ? parseInt(match[1], 10) : null;
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

    // ===== METHOD 1: Try series_info endpoint (IPL 2026 specific) =====
    let updatedCount = 0;

    try {
      const seriesResponse = await fetch(
        `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${IPL_2026_SERIES_ID}`
      );
      const seriesData = await seriesResponse.json();

      if (seriesData.status === 'success' && seriesData.data?.matchList) {
        const apiMatches = seriesData.data.matchList;

        for (const dbMatch of liveMatches) {
          // Try matching by match number first (most reliable)
          const matchByNumber = apiMatches.find((am: any) => {
            const apiMatchNum = extractMatchNumber(am.name || '');
            return apiMatchNum === dbMatch.match_number;
          });

          // Fallback: match by teams
          const matchByTeams = matchByNumber || apiMatches.find((am: any) => {
            const team1Full = TEAMS[dbMatch.team1]?.name?.toLowerCase() || '';
            const team2Full = TEAMS[dbMatch.team2]?.name?.toLowerCase() || '';
            const apiTeams = (am.teams || []).map((t: string) => t.toLowerCase());
            const apiDate = am.date || '';
            const dbDate = dbMatch.match_date?.split('T')[0] || '';

            const teamsMatch =
              apiTeams.some((t: string) => t.includes(team1Full) || team1Full.includes(t)) &&
              apiTeams.some((t: string) => t.includes(team2Full) || team2Full.includes(t));

            return teamsMatch && apiDate === dbDate;
          });

          const apiMatch = matchByNumber || matchByTeams;

          if (apiMatch && apiMatch.matchEnded === true) {
            // Match has ended — try to get the winner from status text
            // Status format: "Team Name won by X runs" or "Team Name won by X wickets"
            const statusText = apiMatch.status || '';
            let winnerAbbr: string | null = null;

            // Try to extract winner from status
            const wonMatch = statusText.match(/^(.+?)\s+won\s+by/i);
            if (wonMatch) {
              winnerAbbr = mapTeamName(wonMatch[1]);
            }

            // If no winner from status, try matchWinner field
            if (!winnerAbbr && apiMatch.matchWinner) {
              winnerAbbr = mapTeamName(apiMatch.matchWinner);
            }

            if (winnerAbbr && (winnerAbbr === dbMatch.team1 || winnerAbbr === dbMatch.team2)) {
              await supabaseAdmin
                .from('matches')
                .update({ status: 'completed', winner: winnerAbbr })
                .eq('id', dbMatch.id);

              summary.push(`Match #${dbMatch.match_number}: ${dbMatch.team1} vs ${dbMatch.team2} — winner: ${winnerAbbr}`);
              updatedCount++;
            } else if (apiMatch.matchEnded) {
              // Match ended but we couldn't determine winner — log it
              summary.push(`Match #${dbMatch.match_number}: ${dbMatch.team1} vs ${dbMatch.team2} — ended but winner unclear (status: "${statusText}")`);
            }
          } else if (apiMatch) {
            // Match found but not ended yet
            const statusText = apiMatch.status || 'unknown';
            summary.push(`Match #${dbMatch.match_number}: ${dbMatch.team1} vs ${dbMatch.team2} — in progress (${statusText})`);
          }
        }
      } else {
        summary.push('Series API returned no data: ' + (seriesData.info?.message || seriesData.message || 'unknown'));
      }
    } catch (seriesError: any) {
      summary.push('Series API error: ' + seriesError.message);
    }

    // ===== METHOD 2: Fallback to currentMatches endpoint =====
    if (updatedCount === 0) {
      try {
        const apiResponse = await fetch(
          `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`
        );
        const apiData = await apiResponse.json();

        if (apiData.status === 'success' && apiData.data) {
          const iplCompleted = apiData.data.filter(
            (m: any) =>
              m.matchType === 't20' &&
              (m.name?.includes('IPL') || m.name?.includes('Indian Premier League') ||
               m.series?.includes('Indian Premier League')) &&
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

              if (teamsMatch) {
                let winnerAbbr: string | null = null;

                // Try status text first
                const wonMatch = (apiMatch.status || '').match(/^(.+?)\s+won\s+by/i);
                if (wonMatch) {
                  winnerAbbr = mapTeamName(wonMatch[1]);
                }
                // Fallback to matchWinner
                if (!winnerAbbr && apiMatch.matchWinner) {
                  winnerAbbr = mapTeamName(apiMatch.matchWinner);
                }

                if (winnerAbbr && (winnerAbbr === dbMatch.team1 || winnerAbbr === dbMatch.team2)) {
                  await supabaseAdmin
                    .from('matches')
                    .update({ status: 'completed', winner: winnerAbbr })
                    .eq('id', dbMatch.id);

                  summary.push(`Match #${dbMatch.match_number}: ${dbMatch.team1} vs ${dbMatch.team2} — winner: ${winnerAbbr} (via currentMatches)`);
                }
              }
            }
          }
        }
      } catch (fallbackError: any) {
        summary.push('Fallback API error: ' + fallbackError.message);
      }
    }

    if (summary.length === 0) {
      summary.push('No updates needed');
    }

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || '') }, { status: 500 });
  }
}
