// utils/store.js - game sessions with disk persistence

const { v4: uuidv4 } = require("uuid");
const {
  isAnswerCorrect,
  parseNumericAnswer,
  scorePlaceAnswer,
} = require("./answerMatch");
const { buildAnswerBreakdown } = require("./answerArchive");
const persistence = require("./persistence");
const { buildRoundIntro } = require("./roundMeta");
const {
  formatQuestion,
  formatReviewQuestion,
} = require("./quizFormat");

const sessions = {};

function persist(gameId) {
  const sess = sessions[gameId];
  if (sess) persistence.saveGame(sess);
}

function loadGameIntoMemory(gameId) {
  if (sessions[gameId]) return sessions[gameId];
  const loaded = persistence.loadGame(gameId);
  if (loaded) {
    if (loaded.reviewQuestionIndex === undefined) loaded.reviewQuestionIndex = 0;
    if (!loaded.roundAnswers) loaded.roundAnswers = {};
    sessions[gameId] = loaded;
  }
  return sessions[gameId] || null;
}

function ensureGame(gameId) {
  return loadGameIntoMemory(gameId);
}

function archiveQuestionAnswers(sess, questionIndex) {
  const round = sess.rounds[sess.currentRoundIndex];
  const question = round?.questions[questionIndex];
  if (!round || !question) return;

  if (!sess.roundAnswers) sess.roundAnswers = {};
  const key = `${sess.currentRoundIndex}-${questionIndex}`;
  sess.roundAnswers[key] = buildAnswerBreakdown(sess, round, question);
}

function getRoundIntro(sess) {
  const round = sess.rounds[sess.currentRoundIndex];
  if (!round) return null;
  return buildRoundIntro(
    round,
    sess.currentRoundIndex + 1,
    sess.rounds.length
  );
}

function getReviewQuestion(sess) {
  const round = sess.rounds[sess.currentRoundIndex];
  if (!round) return null;
  const question = round.questions[sess.reviewQuestionIndex];
  if (!question) return null;
  const key = `${sess.currentRoundIndex}-${sess.reviewQuestionIndex}`;
  const breakdown = sess.roundAnswers?.[key] || null;
  return formatReviewQuestion(round, question, sess.reviewQuestionIndex, breakdown);
}
function getCurrentQuestion(sess) {
  const round = sess.rounds[sess.currentRoundIndex];
  if (!round) return null;
  const question = round.questions[sess.currentQuestionIndex];
  if (!question) return null;
  return formatQuestion(round, question, sess.currentQuestionIndex);
}

function playerHasAnswer(answer) {
  if (answer === null || answer === "") return false;
  if (typeof answer === "object") {
    return Boolean(String(answer.city || "").trim() || String(answer.country || "").trim());
  }
  return true;
}

function scoreClosestQuestion(sess, question) {
  const correct = Number(question.answer);
  const points = question.points ?? 3;
  let bestDiff = Infinity;
  const entries = [];

  Object.values(sess.players).forEach((player) => {
    const num = parseNumericAnswer(player.answer);
    entries.push({ player, num });
    if (!Number.isNaN(num)) {
      const diff = Math.abs(num - correct);
      if (diff < bestDiff) bestDiff = diff;
    }
    player.answer = null;
  });

  if (!Number.isFinite(bestDiff)) return;

  entries.forEach(({ player, num }) => {
    if (!Number.isNaN(num) && Math.abs(num - correct) === bestDiff) {
      player.score += points;
    }
  });
}

function scorePlaceQuestion(sess, question) {
  const cityPoints = question.cityPoints ?? 3;
  const countryPoints = question.countryPoints ?? 1;

  Object.values(sess.players).forEach((player) => {
    if (playerHasAnswer(player.answer)) {
      const result = scorePlaceAnswer(player.answer, question);
      if (result.city) player.score += cityPoints;
      if (result.country) player.score += countryPoints;
    }
    player.answer = null;
  });
}

function scoreCurrentQuestion(sess) {
  const round = sess.rounds[sess.currentRoundIndex];
  if (!round) return;
  const questionIndex = sess.currentQuestionIndex;
  const question = round.questions[questionIndex];
  if (!question) return;

  archiveQuestionAnswers(sess, questionIndex);

  if (round.type === "closest") {
    scoreClosestQuestion(sess, question);
    return;
  }

  if (round.type === "place") {
    scorePlaceQuestion(sess, question);
    return;
  }

  Object.values(sess.players).forEach((player) => {
    if (playerHasAnswer(player.answer)) {
      if (isAnswerCorrect(player.answer, question, round.type)) {
        player.score += question.points ?? 1;
      }
    }
    player.answer = null;
  });
}

function addPlayer(gameId, playerName, socketId, avatar = null) {
  const sess = ensureGame(gameId);
  if (!sess || sess.phase === "finished") return null;

  const playerId = uuidv4();
  sess.players[playerId] = {
    name: playerName,
    socketId,
    score: 0,
    answer: null,
    avatar: avatar || null,
  };
  persistence.appendHistory(sess, { type: "player_joined", playerId, name: playerName });
  persist(gameId);
  return playerId;
}

function rejoinPlayer(gameId, playerId, socketId) {
  const sess = ensureGame(gameId);
  if (!sess) return null;
  const player = sess.players[playerId];
  if (!player) return null;
  player.socketId = socketId;
  persist(gameId);
  return playerId;
}

function getPlayers(gameId) {
  const sess = ensureGame(gameId);
  if (!sess) return [];
  return Object.entries(sess.players).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar,
    answered: playerHasAnswer(p.answer),
    online: Boolean(p.socketId),
  }));
}

function startQuiz(gameId) {
  const sess = ensureGame(gameId);
  if (!sess || sess.started) return null;
  sess.started = true;
  sess.status = "active";
  sess.currentRoundIndex = 0;
  sess.currentQuestionIndex = 0;
  sess.reviewQuestionIndex = 0;
  sess.phase = "round_intro";
  sess.roundAnswers = {};
  Object.values(sess.players).forEach((p) => {
    p.score = 0;
    p.answer = null;
  });
  persistence.appendHistory(sess, { type: "started" });
  persist(gameId);
  return { roundIntro: getRoundIntro(sess) };
}

function advanceQuestion(gameId) {
  const sess = ensureGame(gameId);
  if (!sess) return { finished: true, final: true };

  if (sess.phase === "round_intro") {
    sess.phase = "question";
    sess.currentQuestionIndex = 0;
    persist(gameId);
    return { finished: false, currentQuestion: getCurrentQuestion(sess) };
  }

  if (sess.phase === "round_leaderboard") {
    if (sess.currentRoundIndex >= sess.rounds.length - 1) {
      sess.phase = "finished";
      sess.status = "finished";
      persistence.appendHistory(sess, { type: "finished" });
      persist(gameId);
      return {
        finished: true,
        final: true,
        leaderboard: getLeaderboard(gameId),
      };
    }

    sess.currentRoundIndex += 1;
    sess.currentQuestionIndex = 0;
    sess.reviewQuestionIndex = 0;
    sess.roundAnswers = {};
    sess.phase = "round_intro";
    persist(gameId);
    return { finished: false, roundIntro: getRoundIntro(sess) };
  }

  if (sess.phase === "round_complete") {
    sess.phase = "round_review";
    sess.reviewQuestionIndex = 0;
    persist(gameId);
    return { reviewQuestion: getReviewQuestion(sess) };
  }

  if (sess.phase === "round_review") {
    const round = sess.rounds[sess.currentRoundIndex];
    sess.reviewQuestionIndex += 1;

    if (sess.reviewQuestionIndex >= round.questions.length) {
      sess.phase = "round_leaderboard";
      persist(gameId);
      return {
        finished: false,
        roundEnd: true,
        round: round.id,
        roundTitle: round.title,
        leaderboard: getLeaderboard(gameId),
        isLastRound: sess.currentRoundIndex >= sess.rounds.length - 1,
      };
    }

    persist(gameId);
    return { reviewQuestion: getReviewQuestion(sess) };
  }

  scoreCurrentQuestion(sess);

  const round = sess.rounds[sess.currentRoundIndex];
  sess.currentQuestionIndex += 1;

  if (sess.currentQuestionIndex >= round.questions.length) {
    sess.phase = "round_complete";
    sess.reviewQuestionIndex = 0;
    persistence.appendHistory(sess, {
      type: "round_complete",
      round: round.id,
      roundTitle: round.title,
    });
    persist(gameId);
    return {
      finished: false,
      roundComplete: true,
      round: round.id,
      roundTitle: round.title,
    };
  }

  persistence.appendHistory(sess, {
    type: "question",
    round: round.id,
    questionNumber: sess.currentQuestionIndex + 1,
  });
  persist(gameId);
  return { finished: false, currentQuestion: getCurrentQuestion(sess) };
}

function recordAnswer(gameId, playerId, answer) {
  const sess = ensureGame(gameId);
  if (!sess || sess.phase !== "question") return null;
  const player = sess.players[playerId];
  if (!player) return null;
  if (playerHasAnswer(player.answer)) return false;
  player.answer = answer;
  persist(gameId);
  return true;
}

function recordAnswerBySocket(gameId, socketId, answer) {
  const sess = ensureGame(gameId);
  if (!sess || sess.phase !== "question") return null;
  const entry = Object.entries(sess.players).find(([, p]) => p.socketId === socketId);
  if (!entry) return null;
  const [, player] = entry;
  if (playerHasAnswer(player.answer)) return false;
  player.answer = answer;
  persist(gameId);
  return true;
}

function getLeaderboard(gameId) {
  const sess = ensureGame(gameId);
  if (!sess) return [];
  return Object.entries(sess.players)
    .map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score,
      avatar: p.avatar,
    }))
    .sort((a, b) => b.score - a.score);
}

function detachSocket(socketId) {
  for (const sess of Object.values(sessions)) {
    for (const p of Object.values(sess.players)) {
      if (p.socketId === socketId) {
        p.socketId = null;
        persist(sess.gameId);
        return { gameId: sess.gameId };
      }
    }
  }
  return null;
}

function buildSessionSnapshot(sess, gameId) {
  const snap = {
    gameId,
    started: sess.started,
    phase: sess.phase,
    status: sess.status,
    players: getPlayers(gameId),
  };

  if (sess.phase === "round_intro") {
    snap.roundIntro = getRoundIntro(sess);
  }

  if (sess.started && sess.phase === "question") {
    snap.currentQuestion = getCurrentQuestion(sess);
  }

  if (sess.phase === "round_complete") {
    const round = sess.rounds[sess.currentRoundIndex];
    snap.roundComplete = {
      round: round.id,
      roundTitle: round.title,
    };
  }

  if (sess.phase === "round_review") {
    snap.reviewQuestion = getReviewQuestion(sess);
  }

  if (sess.phase === "round_leaderboard") {
    const round = sess.rounds[sess.currentRoundIndex];
    snap.roundLeaderboard = {
      round: round.id,
      roundTitle: round.title,
      leaderboard: getLeaderboard(gameId),
      isLastRound: sess.currentRoundIndex >= sess.rounds.length - 1,
    };
  }

  if (sess.phase === "finished") {
    snap.finalLeaderboard = getLeaderboard(gameId);
  }

  return snap;
}

function getSessionSnapshot(gameId) {
  const sess = ensureGame(gameId);
  if (!sess) return null;
  return buildSessionSnapshot(sess, gameId);
}

function getPlayerSessionSnapshot(gameId, playerId) {
  const snap = getSessionSnapshot(gameId);
  if (!snap) return null;
  const sess = ensureGame(gameId);
  const player = sess?.players[playerId];
  snap.playerId = playerId;
  snap.playerAnswered =
    playerHasAnswer(player?.answer) && sess.phase === "question";
  return snap;
}

function loadAllGamesIntoMemory() {
  const list = persistence.listGames();
  for (const meta of list) {
    if (meta.status !== "finished") {
      loadGameIntoMemory(meta.gameId);
    }
  }
}

function registerGame(game) {
  if (!game?.gameId) return null;
  sessions[game.gameId] = game;
  return game;
}

function removeGame(gameId) {
  delete sessions[gameId];
}

module.exports = {
  ensureGame,
  addPlayer,
  rejoinPlayer,
  getPlayers,
  startQuiz,
  advanceQuestion,
  recordAnswer,
  recordAnswerBySocket,
  getLeaderboard,
  detachSocket,
  getSessionSnapshot,
  getPlayerSessionSnapshot,
  loadAllGamesIntoMemory,
  registerGame,
  removeGame,
};
