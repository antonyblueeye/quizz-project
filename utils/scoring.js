/** Default points per round id (1–10). Overridable in quiz.json on each round. */
const ROUND_DEFAULTS = {
  1: { questionPoints: 0.5 },
  2: { questionPoints: 1 },
  3: { titlePoints: 3, artistPoints: 1 },
  4: { questionPoints: 0.5 },
  5: { questionPoints: 1 },
  6: { questionPoints: 1 },
  7: { cityPoints: 3, countryPoints: 1 },
  8: { closestPoints: 3 },
  9: { questionPoints: 0.5 },
  10: { matchPoints: 0.5 },
};

function roundDefaults(round) {
  return ROUND_DEFAULTS[round?.id] || {};
}

function getQuestionPoints(round, question) {
  return (
    question?.points ??
    round?.questionPoints ??
    roundDefaults(round).questionPoints ??
    1
  );
}

function getSongTitlePoints(round, question) {
  return (
    question?.titlePoints ??
    round?.titlePoints ??
    roundDefaults(round).titlePoints ??
    1
  );
}

function getSongArtistPoints(round, question) {
  return (
    question?.artistPoints ??
    round?.artistPoints ??
    roundDefaults(round).artistPoints ??
    1
  );
}

function getCityPoints(round, question) {
  return (
    question?.cityPoints ??
    round?.cityPoints ??
    roundDefaults(round).cityPoints ??
    3
  );
}

function getCountryPoints(round, question) {
  return (
    question?.countryPoints ??
    round?.countryPoints ??
    roundDefaults(round).countryPoints ??
    1
  );
}

function getClosestPoints(round, question) {
  return (
    question?.points ??
    round?.closestPoints ??
    round?.questionPoints ??
    roundDefaults(round).closestPoints ??
    3
  );
}

function getMatchPoints(round, question) {
  return (
    question?.points ??
    round?.matchPoints ??
    roundDefaults(round).matchPoints ??
    1
  );
}

function formatScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/, "");
}

module.exports = {
  ROUND_DEFAULTS,
  getQuestionPoints,
  getSongTitlePoints,
  getSongArtistPoints,
  getCityPoints,
  getCountryPoints,
  getClosestPoints,
  getMatchPoints,
  formatScore,
};
