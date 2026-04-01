import { MatchStage } from './types';

interface StagePoints {
  correct: number;
  wrong: number;
  missed: number;
}

export function getMatchPoints(stage: MatchStage): StagePoints {
  switch (stage) {
    case 'league':
      return { correct: 5, wrong: -3, missed: -3 };
    case 'qualifier':
    case 'eliminator':
      return { correct: 10, wrong: -5, missed: -5 };
    case 'final':
      return { correct: 15, wrong: -10, missed: -10 };
    default:
      return { correct: 5, wrong: -3, missed: -3 };
  }
}

export function getScoringTable(): { stage: string; correct: number; wrong: number; missed: number }[] {
  return [
    { stage: 'League', correct: 5, wrong: -3, missed: -3 },
    { stage: 'Knockout', correct: 10, wrong: -5, missed: -5 },
    { stage: 'Final', correct: 15, wrong: -10, missed: -10 },
  ];
}

export function isNoResult(winner: string | null): boolean {
  return winner === 'NR';
}

export function calculateScore(
  picks: { match_id: string; picked_team: string }[],
  matches: { id: string; status: string; winner: string | null; stage: MatchStage }[]
): {
  totalPoints: number;
  correctPicks: number;
  wrongPicks: number;
  missedPicks: number;
} {
  let totalPoints = 0;
  let correctPicks = 0;
  let wrongPicks = 0;
  let missedPicks = 0;

  const picksByMatchId = new Map<string, string>();
  for (const pick of picks) {
    picksByMatchId.set(pick.match_id, pick.picked_team);
  }

  const completedMatches = matches.filter((m) => m.status === 'completed');

  for (const match of completedMatches) {
    // Skip No Result matches — 0 points, doesn't count as anything
    if (isNoResult(match.winner)) continue;

    const points = getMatchPoints(match.stage);
    const pickedTeam = picksByMatchId.get(match.id);

    if (!pickedTeam) {
      missedPicks++;
      totalPoints += points.missed;
    } else if (pickedTeam === match.winner) {
      correctPicks++;
      totalPoints += points.correct;
    } else {
      wrongPicks++;
      totalPoints += points.wrong;
    }
  }

  return { totalPoints, correctPicks, wrongPicks, missedPicks };
}
