// app/page.js - Home page showing list of quizzes

import QuizCard from "../components/QuizCard.jsx";

export const metadata = {
  title: "Quiz Platform",
};

const quizzes = [
  {
    id: "quiz1",
    title: "Quiz 1",
    description: "General knowledge quiz — 10 questions per round, real-time play.",
  },
];

export default function Home() {
  return (
    <main className="home-page">
      <header className="home-header">
        <h1 className="home-title">Quiz Platform</h1>
        <p className="home-subtitle">Выберите квиз — история игр сохраняется</p>
      </header>

      <div className="quiz-grid">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>
    </main>
  );
}
