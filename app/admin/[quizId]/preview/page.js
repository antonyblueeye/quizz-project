import { createRequire } from "module";
import QuizStructurePreview from "../../../../components/QuizStructurePreview.jsx";

const require = createRequire(import.meta.url);
const { loadQuizTemplate } = require("../../../../utils/loadQuizTemplate.js");

export const metadata = {
  title: "Quiz — Structure preview",
};

const QUIZ_TITLES = {
  quiz1: "Quiz 1",
};

export default async function QuizPreviewPage({ params, searchParams }) {
  const { quizId } = await params;
  const sp = await searchParams;
  const quizData = loadQuizTemplate(quizId);

  const initialRoundIndex = Math.max(0, parseInt(sp?.round, 10) - 1 || 0);
  const initialQuestionIndex = Math.max(0, parseInt(sp?.q, 10) - 1 || 0);

  const maxRound = quizData.rounds.length - 1;
  const safeRound = Math.min(initialRoundIndex, maxRound);
  const maxQ = quizData.rounds[safeRound]?.questions.length - 1 ?? 0;
  const safeQ = Math.min(initialQuestionIndex, Math.max(0, maxQ));

  return (
    <QuizStructurePreview
      quizId={quizId}
      quizTitle={QUIZ_TITLES[quizId] || quizId}
      rounds={quizData.rounds}
      initialRoundIndex={safeRound}
      initialQuestionIndex={safeQ}
    />
  );
}
