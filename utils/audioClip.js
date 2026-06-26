function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed) {
  return (hashSeed(String(seed)) % 1_000_000) / 1_000_000;
}

function resolveAudioClipConfig(round, question) {
  const duration = question.audioClipSeconds ?? round.audioClipSeconds;
  if (!duration) return null;

  return {
    duration,
    random: question.audioClipRandom ?? round.audioClipRandom ?? false,
    estimateDuration: question.audioDuration ?? round.defaultAudioDuration ?? 240,
    fixedStart: question.audioClipStart ?? round.audioClipStart ?? 0,
  };
}

function getOrCreateAudioClip(sess, round, question, questionIndex) {
  const config = resolveAudioClipConfig(round, question);
  if (!config) return null;

  if (!sess.audioClips) sess.audioClips = {};
  const key = `${sess.currentRoundIndex}-${questionIndex}`;
  if (sess.audioClips[key]) return sess.audioClips[key];

  let start = config.fixedStart;
  if (config.random) {
    const maxStart = Math.max(0, config.estimateDuration - config.duration);
    start = Math.floor(seededUnit(`${sess.gameId}:${key}`) * (maxStart + 1));
  }

  const clip = {
    start,
    duration: config.duration,
    random: config.random,
  };
  sess.audioClips[key] = clip;
  return clip;
}

module.exports = {
  getOrCreateAudioClip,
  resolveAudioClipConfig,
};
