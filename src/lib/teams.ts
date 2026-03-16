import { Team } from './types';

export const TEAMS: Record<string, Team> = {
  RCB: {
    id: 'rcb',
    name: 'Royal Challengers Bengaluru',
    short_name: 'RCB',
    color: '#d4213d',
  },
  MI: {
    id: 'mi',
    name: 'Mumbai Indians',
    short_name: 'MI',
    color: '#004ba0',
  },
  CSK: {
    id: 'csk',
    name: 'Chennai Super Kings',
    short_name: 'CSK',
    color: '#fdb913',
  },
  GT: {
    id: 'gt',
    name: 'Gujarat Titans',
    short_name: 'GT',
    color: '#1c1c2b',
  },
  DC: {
    id: 'dc',
    name: 'Delhi Capitals',
    short_name: 'DC',
    color: '#004c93',
  },
  SRH: {
    id: 'srh',
    name: 'Sunrisers Hyderabad',
    short_name: 'SRH',
    color: '#ff822a',
  },
  PBKS: {
    id: 'pbks',
    name: 'Punjab Kings',
    short_name: 'PBKS',
    color: '#ed1b24',
  },
  KKR: {
    id: 'kkr',
    name: 'Kolkata Knight Riders',
    short_name: 'KKR',
    color: '#3a225d',
  },
  RR: {
    id: 'rr',
    name: 'Rajasthan Royals',
    short_name: 'RR',
    color: '#ea1a85',
  },
  LSG: {
    id: 'lsg',
    name: 'Lucknow Super Giants',
    short_name: 'LSG',
    color: '#00b7eb',
  },
};

export function getTeamColor(shortName: string): string {
  return TEAMS[shortName]?.color ?? '#a0aec0';
}

export function getTeamFullName(shortName: string): string {
  return TEAMS[shortName]?.name ?? shortName;
}

export function getAllTeamAbbreviations(): string[] {
  return Object.keys(TEAMS);
}