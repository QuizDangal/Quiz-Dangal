export const IPL_TEAMS = [
  {
    id: 'chennai-super-kings',
    name: 'Chennai Super Kings',
    short: 'CSK',
    mascot: '🦁',
    accentClass: 'from-yellow-400 via-amber-400 to-yellow-600',
    chipClass: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-200',
    badgeClass: 'from-yellow-500 to-amber-500',
  },
  {
    id: 'mumbai-indians',
    name: 'Mumbai Indians',
    short: 'MI',
    mascot: '🌊',
    accentClass: 'from-sky-400 via-blue-500 to-indigo-600',
    chipClass: 'bg-sky-500/15 border-sky-400/30 text-sky-200',
    badgeClass: 'from-sky-500 to-indigo-600',
  },
  {
    id: 'royal-challengers-bengaluru',
    name: 'Royal Challengers Bengaluru',
    short: 'RCB',
    mascot: '👑',
    accentClass: 'from-rose-500 via-red-500 to-amber-500',
    chipClass: 'bg-rose-500/15 border-rose-400/30 text-rose-200',
    badgeClass: 'from-rose-500 to-amber-500',
  },
  {
    id: 'kolkata-knight-riders',
    name: 'Kolkata Knight Riders',
    short: 'KKR',
    mascot: '⚔️',
    accentClass: 'from-violet-500 via-purple-500 to-fuchsia-600',
    chipClass: 'bg-violet-500/15 border-violet-400/30 text-violet-200',
    badgeClass: 'from-violet-500 to-fuchsia-600',
  },
  {
    id: 'sunrisers-hyderabad',
    name: 'Sunrisers Hyderabad',
    short: 'SRH',
    mascot: '🔥',
    accentClass: 'from-orange-500 via-amber-500 to-red-500',
    chipClass: 'bg-orange-500/15 border-orange-400/30 text-orange-200',
    badgeClass: 'from-orange-500 to-red-500',
  },
  {
    id: 'rajasthan-royals',
    name: 'Rajasthan Royals',
    short: 'RR',
    mascot: '💗',
    accentClass: 'from-pink-500 via-fuchsia-500 to-violet-600',
    chipClass: 'bg-pink-500/15 border-pink-400/30 text-pink-200',
    badgeClass: 'from-pink-500 to-violet-600',
  },
  {
    id: 'delhi-capitals',
    name: 'Delhi Capitals',
    short: 'DC',
    mascot: '🛡️',
    accentClass: 'from-blue-500 via-sky-500 to-red-500',
    chipClass: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    badgeClass: 'from-blue-500 to-red-500',
  },
  {
    id: 'punjab-kings',
    name: 'Punjab Kings',
    short: 'PBKS',
    mascot: '🦁',
    accentClass: 'from-red-500 via-rose-500 to-slate-300',
    chipClass: 'bg-red-500/15 border-red-400/30 text-red-200',
    badgeClass: 'from-red-500 to-rose-500',
  },
  {
    id: 'lucknow-super-giants',
    name: 'Lucknow Super Giants',
    short: 'LSG',
    mascot: '🚀',
    accentClass: 'from-cyan-400 via-sky-500 to-orange-400',
    chipClass: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-200',
    badgeClass: 'from-cyan-500 to-orange-400',
  },
  {
    id: 'gujarat-titans',
    name: 'Gujarat Titans',
    short: 'GT',
    mascot: '⚡',
    accentClass: 'from-slate-400 via-slate-600 to-blue-500',
    chipClass: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    badgeClass: 'from-slate-500 to-blue-500',
  },
];

const TEAM_INDEX = new Map();
for (const team of IPL_TEAMS) {
  TEAM_INDEX.set(team.id, team);
  TEAM_INDEX.set(team.name.toLowerCase(), team);
  TEAM_INDEX.set(team.short.toLowerCase(), team);
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPositiveInt(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

export function getIplTeam(value) {
  if (!value) return null;
  const direct = TEAM_INDEX.get(String(value).trim().toLowerCase());
  if (direct) return direct;
  return TEAM_INDEX.get(normalizeKey(value)) || null;
}

export function buildIplPredictionMeta(teamAValue, teamBValue, extras = {}) {
  const teamA = getIplTeam(teamAValue);
  const teamB = getIplTeam(teamBValue);
  return {
    prediction_type: 'ipl',
    league: 'IPL',
    team_a: teamA?.name || String(teamAValue || ''),
    team_a_short: teamA?.short || String(teamAValue || ''),
    team_b: teamB?.name || String(teamBValue || ''),
    team_b_short: teamB?.short || String(teamBValue || ''),
    fixture_label:
      extras.fixture_label || `${teamA?.short || String(teamAValue || '').trim()} vs ${teamB?.short || String(teamBValue || '').trim()}`,
    result_mode: 'manual_finalize',
    ...extras,
  };
}

export function getIplPredictionMeta(source) {
  const meta = source?.meta && typeof source.meta === 'object' ? source.meta : source || {};
  if (String(meta?.prediction_type || '').toLowerCase() !== 'ipl') return null;
  const teamA = getIplTeam(meta.team_a) || getIplTeam(meta.team_a_short);
  const teamB = getIplTeam(meta.team_b) || getIplTeam(meta.team_b_short);
  const resultPublishAt = typeof meta.result_publish_at === 'string' && meta.result_publish_at.trim()
    ? meta.result_publish_at
    : null;
  return {
    ...meta,
    teamA,
    teamB,
    consolationCoins: toPositiveInt(meta.consolation_coins),
    resultPublishAt,
    fixtureLabel:
      meta.fixture_label || `${teamA?.short || meta.team_a_short || meta.team_a || 'TEAM A'} vs ${teamB?.short || meta.team_b_short || meta.team_b || 'TEAM B'}`,
  };
}

export function isIplPredictionQuiz(source) {
  if (!source) return false;
  if (source?.is_prediction !== true) return false;
  return !!getIplPredictionMeta(source);
}
