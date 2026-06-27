const { normalize } = require("./answerMatch");
const { getMatchPoints } = require("./scoring");

function imagePath(round, filename) {
  return `/quiz/${round.imageFolder}/${filename}`;
}

function formatReviewMatchQuestion(sess, round) {
  const questionIndex = sess.currentQuestionIndex;
  const question = round.questions[questionIndex];
  if (!question) return null;

  return {
    type: "reviewmatch",
    round: round.id,
    roundTitle: round.title,
    questionNumber: questionIndex + 1,
    totalInRound: round.questions.length,
    text: "К какому месту относится этот отзыв?",
    image: imagePath(round, question.image),
    places: (round.places || []).map((name) => ({ name, used: false })),
    pointsPerMatch: getMatchPoints(round, question),
    scoringHint: `${getMatchPoints(round, question)} б. за верный ответ`,
  };
}

function formatReviewMatchReveal(sess, round, questionIndex) {
  const question = round.questions[questionIndex];
  if (!question) return null;

  const key = `${sess.currentRoundIndex}-${questionIndex}`;
  const breakdown = sess.roundAnswers?.[key] || null;

  return {
    type: "reviewmatch",
    revealMode: true,
    round: round.id,
    roundTitle: round.title,
    questionNumber: questionIndex + 1,
    totalInRound: round.questions.length,
    text: "Результаты ответов",
    image: imagePath(round, question.image),
    correctAnswer: question.answer,
    answerBreakdown: breakdown,
    places: round.places || [],
  };
}

function formatReviewMatchPreview(round, question, questionIndex) {
  return {
    type: "reviewmatch",
    round: round.id,
    roundTitle: round.title,
    questionNumber: questionIndex + 1,
    totalInRound: round.questions.length,
    text: "К какому месту относится этот отзыв?",
    image: question.image ? imagePath(round, question.image) : null,
    places: (round.places || []).map((name) => ({ name, used: false })),
    previewMode: true,
    scoringHint: `${round.matchPoints ?? 0.5} б. за верный ответ`,
  };
}

function isValidReviewMatchPlace(round, place) {
  const placeNorm = normalize(String(place || "").trim());
  if (!placeNorm) return false;
  return (round.places || []).some((p) => normalize(p) === placeNorm);
}

module.exports = {
  formatReviewMatchQuestion,
  formatReviewMatchReveal,
  formatReviewMatchPreview,
  isValidReviewMatchPlace,
};
