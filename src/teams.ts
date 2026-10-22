// Derive the legend and row markers from the game's actual groups.
const PALETTE = ['#517342', '#a0643f', '#4f679b', '#85548d', '#9a782e', '#347875'];
export function teamColors(teams: string[]) {
  return new Map([...new Set(teams)].sort((a, b) => a.localeCompare(b, 'sv')).map((team, i) => [team, PALETTE[i % PALETTE.length]!]));
}
