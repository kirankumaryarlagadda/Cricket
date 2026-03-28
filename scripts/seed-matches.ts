import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually without dotenv
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const value = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MatchSeed {
  match_number: number;
  team1: string;
  team2: string;
  venue: string;
  match_date: string; // ISO 8601 with IST offset
  status: 'upcoming' | 'live' | 'completed';
  winner: null;
  stage: 'league' | 'qualifier' | 'eliminator' | 'final';
}

const matches: MatchSeed[] = [
  { match_number: 1,  team1: 'RCB',  team2: 'SRH',  venue: 'M Chinnaswamy Stadium, Bengaluru',      match_date: '2026-03-28T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 2,  team1: 'MI',   team2: 'KKR',  venue: 'Wankhede Stadium, Mumbai',              match_date: '2026-03-29T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 3,  team1: 'RR',   team2: 'CSK',  venue: 'ACA Stadium, Guwahati',                 match_date: '2026-03-30T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 4,  team1: 'PBKS', team2: 'GT',   venue: 'PCA New Stadium, New Chandigarh',       match_date: '2026-03-31T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 5,  team1: 'LSG',  team2: 'DC',   venue: 'Ekana Cricket Stadium, Lucknow',        match_date: '2026-04-01T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 6,  team1: 'KKR',  team2: 'SRH',  venue: 'Eden Gardens, Kolkata',                 match_date: '2026-04-02T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 7,  team1: 'CSK',  team2: 'PBKS', venue: 'MA Chidambaram Stadium, Chennai',       match_date: '2026-04-03T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 8,  team1: 'DC',   team2: 'MI',   venue: 'Arun Jaitley Stadium, Delhi',           match_date: '2026-04-04T15:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 9,  team1: 'GT',   team2: 'RR',   venue: 'Narendra Modi Stadium, Ahmedabad',      match_date: '2026-04-04T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 10, team1: 'SRH',  team2: 'LSG',  venue: 'Rajiv Gandhi Intl Stadium, Hyderabad',  match_date: '2026-04-05T15:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 11, team1: 'RCB',  team2: 'CSK',  venue: 'M Chinnaswamy Stadium, Bengaluru',      match_date: '2026-04-05T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 12, team1: 'KKR',  team2: 'PBKS', venue: 'Eden Gardens, Kolkata',                 match_date: '2026-04-06T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 13, team1: 'RR',   team2: 'MI',   venue: 'ACA Stadium, Guwahati',                 match_date: '2026-04-07T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 14, team1: 'DC',   team2: 'GT',   venue: 'Arun Jaitley Stadium, Delhi',           match_date: '2026-04-08T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 15, team1: 'KKR',  team2: 'LSG',  venue: 'Eden Gardens, Kolkata',                 match_date: '2026-04-09T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 16, team1: 'RR',   team2: 'RCB',  venue: 'ACA Stadium, Guwahati',                 match_date: '2026-04-10T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 17, team1: 'PBKS', team2: 'SRH',  venue: 'PCA New Stadium, New Chandigarh',       match_date: '2026-04-11T15:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 18, team1: 'CSK',  team2: 'DC',   venue: 'MA Chidambaram Stadium, Chennai',       match_date: '2026-04-11T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 19, team1: 'LSG',  team2: 'GT',   venue: 'Ekana Cricket Stadium, Lucknow',        match_date: '2026-04-12T15:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
  { match_number: 20, team1: 'MI',   team2: 'RCB',  venue: 'Wankhede Stadium, Mumbai',              match_date: '2026-04-12T19:30:00+05:30', status: 'upcoming', winner: null, stage: 'league' },
];

async function seed() {
  console.log('🏏 Seeding IPL 2026 matches...');

  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'match_number' })
    .select();

  if (error) {
    console.error('❌ Error seeding matches:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data.length} matches!`);

  for (const match of matches) {
    const time = match.match_date.includes('T15:30') ? '3:30 PM' : '7:30 PM';
    console.log(
      `  Match ${String(match.match_number).padStart(2, '0')}: ${match.team1} vs ${match.team2} | ${match.venue} | ${match.match_date.slice(0, 10)} ${time}`
    );
  }
}

seed();
