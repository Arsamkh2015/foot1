// ------------------------------------------------------------------
// Clubs, fixtures, simulation + persistence for Clásico Nights
// ------------------------------------------------------------------

export type Difficulty = "amateur" | "pro" | "legend";

export interface StarPlayer {
  name: string;
  pos: "GK" | "DF" | "MF" | "FW";
  rating: number;
}

export interface TeamDef {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  gk: string;
  rating: number;
  stars: StarPlayer[];
}

export const TEAMS: TeamDef[] = [
  {
    id: "bar",
    name: "Barcelona",
    short: "BAR",
    primary: "#A50044",
    secondary: "#004D98",
    gk: "#FF8A00",
    rating: 90,
    stars: [
      { name: "Lamine Yamal", pos: "FW", rating: 92 },
      { name: "Lewandowski", pos: "FW", rating: 90 },
      { name: "Raphinha", pos: "FW", rating: 89 },
      { name: "Pedri", pos: "MF", rating: 89 },
      { name: "Cubarsí", pos: "DF", rating: 86 },
      { name: "Ter Stegen", pos: "GK", rating: 87 },
    ],
  },
  {
    id: "rma",
    name: "Real Madrid",
    short: "RMA",
    primary: "#F5F7FF",
    secondary: "#FF5FA2",
    gk: "#2BD9A0",
    rating: 91,
    stars: [
      { name: "Mbappé", pos: "FW", rating: 93 },
      { name: "Vinicius Jr", pos: "FW", rating: 92 },
      { name: "Bellingham", pos: "MF", rating: 91 },
      { name: "Valverde", pos: "MF", rating: 89 },
      { name: "Rodrygo", pos: "FW", rating: 88 },
      { name: "Courtois", pos: "GK", rating: 90 },
    ],
  },
  {
    id: "atm",
    name: "Atlético Madrid",
    short: "ATM",
    primary: "#CB3524",
    secondary: "#F5F7FF",
    gk: "#6CE0B8",
    rating: 86,
    stars: [
      { name: "Griezmann", pos: "FW", rating: 88 },
      { name: "Julián Álvarez", pos: "FW", rating: 87 },
      { name: "Oblak", pos: "GK", rating: 90 },
      { name: "Koke", pos: "MF", rating: 86 },
      { name: "Giménez", pos: "DF", rating: 85 },
    ],
  },
  {
    id: "sev",
    name: "Sevilla",
    short: "SEV",
    primary: "#F5F7FF",
    secondary: "#D90000",
    gk: "#8A7CFF",
    rating: 82,
    stars: [
      { name: "Lukébakio", pos: "FW", rating: 84 },
      { name: "Isaac Romero", pos: "FW", rating: 82 },
      { name: "Gudelj", pos: "MF", rating: 82 },
      { name: "Saúl", pos: "MF", rating: 81 },
      { name: "Nyland", pos: "GK", rating: 80 },
    ],
  },
  {
    id: "vil",
    name: "Villarreal",
    short: "VIL",
    primary: "#FFE114",
    secondary: "#1769FF",
    gk: "#FF7AC6",
    rating: 83,
    stars: [
      { name: "Gerard Moreno", pos: "FW", rating: 85 },
      { name: "Baena", pos: "MF", rating: 85 },
      { name: "Parejo", pos: "MF", rating: 85 },
      { name: "Barry", pos: "FW", rating: 81 },
      { name: "Conde", pos: "GK", rating: 81 },
    ],
  },
  {
    id: "ath",
    name: "Athletic Club",
    short: "ATH",
    primary: "#EE2523",
    secondary: "#F5F7FF",
    gk: "#C9F24B",
    rating: 84,
    stars: [
      { name: "Nico Williams", pos: "FW", rating: 87 },
      { name: "Iñaki Williams", pos: "FW", rating: 84 },
      { name: "Unai Simón", pos: "GK", rating: 86 },
      { name: "Sancet", pos: "MF", rating: 85 },
      { name: "De Marcos", pos: "DF", rating: 82 },
    ],
  },
  {
    id: "val",
    name: "Valencia",
    short: "VAL",
    primary: "#F5F7FF",
    secondary: "#F18E00",
    gk: "#39D0FF",
    rating: 80,
    stars: [
      { name: "Hugo Duro", pos: "FW", rating: 82 },
      { name: "Javi Guerra", pos: "MF", rating: 84 },
      { name: "Pepelu", pos: "MF", rating: 82 },
      { name: "Mamardashvili", pos: "GK", rating: 86 },
      { name: "Rioja", pos: "FW", rating: 80 },
    ],
  },
  {
    id: "bet",
    name: "Real Betis",
    short: "BET",
    primary: "#00954C",
    secondary: "#F5F7FF",
    gk: "#FFD84D",
    rating: 81,
    stars: [
      { name: "Isco", pos: "MF", rating: 86 },
      { name: "Lo Celso", pos: "MF", rating: 85 },
      { name: "Fornals", pos: "MF", rating: 84 },
      { name: "Bakambu", pos: "FW", rating: 81 },
      { name: "Rui Silva", pos: "GK", rating: 81 },
    ],
  },
];

export const teamById = (id: string): TeamDef =>
  TEAMS.find((t) => t.id === id) ?? TEAMS[0];

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------

export interface Settings {
  duration: 60 | 90 | 150;
  difficulty: Difficulty;
  volume: number;
  muted: boolean;
  shake: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  duration: 90,
  difficulty: "pro",
  volume: 0.8,
  muted: false,
  shake: true,
};

export const DIFF_LABEL: Record<Difficulty, string> = {
  amateur: "Amateur",
  pro: "Pro",
  legend: "Legend",
};

export const DUR_LABEL: Record<number, string> = {
  60: "Quick — 60s",
  90: "Classic — 90s",
  150: "Epic — 150s",
};

// ------------------------------------------------------------------
// Storage helpers
// ------------------------------------------------------------------

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — play on */
  }
}

// ------------------------------------------------------------------
// Fixtures + match simulation
// ------------------------------------------------------------------

export interface Fixture {
  home: string;
  away: string;
}
export type Round = Fixture[];

/** Single round-robin (circle method). */
export function roundRobin(ids: string[]): Round[] {
  const arr = [...ids];
  if (arr.length % 2 === 1) arr.push("BYE");
  const n = arr.length;
  const rounds: Round[] = [];
  const half = n / 2;
  const rot = arr.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round: Round = [];
    const cur = [arr[0], ...rot];
    for (let i = 0; i < half; i++) {
      const a = cur[i];
      const b = cur[n - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        round.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
      }
    }
    rounds.push(round);
    rot.unshift(rot.pop() as string);
  }
  return rounds;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 12);
  return k - 1;
}

/** Simulate a CPU vs CPU scoreline from club ratings. */
export function simulateScore(home: TeamDef, away: TeamDef): [number, number] {
  const diff = (home.rating - away.rating) / 8;
  const lh = Math.min(4.2, Math.max(0.18, 1.32 + diff * 0.5 + 0.18));
  const la = Math.min(4.2, Math.max(0.18, 1.32 - diff * 0.5));
  return [poisson(lh), poisson(la)];
}

// ------------------------------------------------------------------
// Career mode state
// ------------------------------------------------------------------

export interface TableRow {
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}

export interface CareerState {
  season: number;
  userTeam: string;
  round: number;
  schedule: Round[];
  table: Record<string, TableRow>;
  history: string[];
  done: boolean;
}

export function newCareer(userTeam: string): CareerState {
  const table: Record<string, TableRow> = {};
  TEAMS.forEach((t) => (table[t.id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }));
  return {
    season: 1,
    userTeam,
    round: 0,
    schedule: roundRobin(TEAMS.map((t) => t.id)),
    table,
    history: [],
    done: false,
  };
}

export function recordResult(
  table: Record<string, TableRow>,
  home: string,
  away: string,
  gh: number,
  ga: number
) {
  const h = table[home];
  const a = table[away];
  if (!h || !a) return;
  h.p++;
  a.p++;
  h.gf += gh;
  h.ga += ga;
  a.gf += ga;
  a.ga += gh;
  if (gh > ga) {
    h.w++;
    a.l++;
  } else if (gh < ga) {
    a.w++;
    h.l++;
  } else {
    h.d++;
    a.d++;
  }
}

export const points = (r: TableRow) => r.w * 3 + r.d;

// ------------------------------------------------------------------
// Cup mode state
// ------------------------------------------------------------------

export interface CupTie {
  home: string;
  away: string;
  gh: number;
  ga: number;
  played: boolean;
}

export interface CupState {
  userTeam: string;
  stage: number; // 0 = QF, 1 = SF, 2 = Final, 3 = done
  stages: CupTie[][];
  champion: string | null;
}

export function newCup(userTeam: string): CupState {
  const ids = TEAMS.map((t) => t.id).sort(() => Math.random() - 0.5);
  if (!ids.includes(userTeam)) ids[0] = userTeam;
  const qf: CupTie[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    qf.push({ home: ids[i], away: ids[i + 1], gh: 0, ga: 0, played: false });
  }
  return {
    userTeam,
    stage: 0,
    stages: [qf, [], []],
    champion: null,
  };
}

/** Winners advance; drawn ties go to a simulated penalty shootout. */
export function cupWinners(ties: CupTie[]): string[] {
  return ties.map((t) => {
    if (t.gh !== t.ga) return t.gh > t.ga ? t.home : t.away;
    return Math.random() < 0.5 ? t.home : t.away;
  });
}
