const { normalize } = require("./answerMatch");
const { getMatchPoints } = require("./scoring");

function imagePath(round, filename) {
  return `/quiz/${round.imageFolder}/${filename}`;
}

function initReviewMatch(sess) {
  sess.matchState = {
    usedPlaces: [],
    results: [],
    playerOrder: Object.keys(sess.players),
    lastFeedback: null,
  };
  sess.currentQuestionIndex = 0;
}

function syncPlayerOrder(sess) {
  if (!sess.matchState) initReviewMatch(sess);
  const ms = sess.matchState;
  const live = Object.keys(sess.players);
  const kept = ms.playerOrder.filter((id) => sess.players[id]);
  ms.playerOrder = kept.length > 0 ? kept : live;
}

function getActivePlayerId(sess) {
  syncPlayerOrder(sess);
  const ms = sess.matchState;
  if (!ms?.playerOrder?.length) return null;
  return ms.playerOrder[sess.currentQuestionIndex % ms.playerOrder.length];
}

function isPlaceUsed(ms, placeName) {
  return ms.usedPlaces.includes(normalize(placeName));
}

function buildPlaceCards(round, matchState) {
  const places = round.places || [];
  const usedMap = new Map();

  for (const result of matchState?.results || []) {
    usedMap.set(normalize(result.pickedPlace), result);
  }

  return places.map((place) => {
    const entry = usedMap.get(normalize(place));
    return {
      name: place,
      used: Boolean(entry),
      pickedBy: entry?.playerName || null,
      correct: entry?.correct ?? null,
      wasCorrectAnswer: entry
        ? normalize(entry.correctAnswer) === normalize(place)
        : false,
    };
  });
}

function formatReviewMatchQuestion(sess, round, viewerPlayerId = null) {
  syncPlayerOrder(sess);
  const ms = sess.matchState || { usedPlaces: [], results: [], playerOrder: [] };
  const reviewIndex = sess.currentQuestionIndex;
  const question = round.questions[reviewIndex];
  const activePlayerId = getActivePlayerId(sess);
  const activePlayer = activePlayerId ? sess.players[activePlayerId] : null;

  return {
    type: "reviewmatch",
    round: round.id,
    roundTitle: round.title,
    reviewNumber: reviewIndex + 1,
    totalReviews: round.questions.length,
    image: question ? imagePath(round, question.image) : null,
    places: buildPlaceCards(round, ms),
    availablePlaces: (round.places || []).filter((p) => !isPlaceUsed(ms, p)),
    activePlayer: activePlayer
      ? {
          id: activePlayerId,
          name: activePlayer.name,
          avatar: activePlayer.avatar || null,
        }
      : null,
    isYourTurn: viewerPlayerId ? viewerPlayerId === activePlayerId : false,
    matchHistory: ms.results.map((r) => ({
      reviewNumber: r.reviewIndex + 1,
      image: imagePath(round, round.questions[r.reviewIndex]?.image),
      playerName: r.playerName,
      pickedPlace: r.pickedPlace,
      correctAnswer: r.correctAnswer,
      correct: r.correct,
    })),
    lastFeedback: ms.lastFeedback,
    pointsPerMatch: round.matchPoints ?? 1,
  };
}

function formatReviewMatchSummary(sess, round) {
  const ms = sess.matchState || { results: [] };
  const items = round.questions.map((question, index) => {
    const result = ms.results.find((r) => r.reviewIndex === index);
    return {
      reviewNumber: index + 1,
      image: imagePath(round, question.image),
      correctAnswer: question.answer,
      pickedPlace: result?.pickedPlace || null,
      playerName: result?.playerName || null,
      correct: result?.correct ?? false,
    };
  });

  return {
    type: "reviewmatch",
    reviewMode: true,
    round: round.id,
    roundTitle: round.title,
    text: "Итоги сопоставления отзывов",
    summaryItems: items,
    places: round.places || [],
  };
}

function recordReviewMatchAnswer(sess, playerId, place) {
  const round = sess.rounds[sess.currentRoundIndex];
  if (round?.type !== "reviewmatch" || sess.phase !== "question") {
    return { ok: false, error: "invalid_state" };
  }

  if (!sess.matchState) initReviewMatch(sess);

  const ms = sess.matchState;
  const reviewIndex = sess.currentQuestionIndex;
  const question = round.questions[reviewIndex];
  if (!question) return { ok: false, error: "no_question" };

  const activePlayerId = getActivePlayerId(sess);
  if (playerId !== activePlayerId) {
    return { ok: false, error: "not_your_turn" };
  }

  const placeName = String(place).trim();
  if (!placeName) return { ok: false, error: "empty" };

  const placeNorm = normalize(placeName);
  const validPlace = (round.places || []).some((p) => normalize(p) === placeNorm);
  if (!validPlace) return { ok: false, error: "invalid_place" };
  if (isPlaceUsed(ms, placeName)) return { ok: false, error: "place_used" };

  const player = sess.players[playerId];
  if (!player) return { ok: false, error: "no_player" };

  const correct = placeNorm === normalize(question.answer);
  const points = getMatchPoints(round, question);
  if (correct) player.score += points;

  ms.usedPlaces.push(placeNorm);
  ms.results.push({
    reviewIndex,
    playerId,
    playerName: player.name,
    pickedPlace: placeName,
    correctAnswer: question.answer,
    correct,
  });

  ms.lastFeedback = {
    playerName: player.name,
    pickedPlace: placeName,
    correctAnswer: question.answer,
    correct,
  };

  sess.currentQuestionIndex += 1;

  if (sess.currentQuestionIndex >= round.questions.length) {
    sess.phase = "round_complete";
    sess.reviewQuestionIndex = 0;
    return {
      ok: true,
      done: true,
      feedback: ms.lastFeedback,
      roundComplete: {
        round: round.id,
        roundTitle: round.title,
      },
    };
  }

  return {
    ok: true,
    feedback: ms.lastFeedback,
  };
}

module.exports = {
  initReviewMatch,
  formatReviewMatchQuestion,
  formatReviewMatchSummary,
  recordReviewMatchAnswer,
  getActivePlayerId,
};
