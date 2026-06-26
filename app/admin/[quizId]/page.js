import GameLobby from "../../../components/GameLobby.jsx";

export const metadata = {
  title: "Quiz — Games",
};

const QUIZ_TITLES = {
  quiz1: "Quiz 1",
};

export default async function QuizGamesPage({ params }) {
  const { quizId } = await params;
  return (
    <GameLobby quizId={quizId} quizTitle={QUIZ_TITLES[quizId] || quizId} />
  );
}
