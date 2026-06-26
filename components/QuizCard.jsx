import Link from "next/link";

export default function QuizCard({ quiz }) {
  return (
    <Link href={`/admin/${quiz.id}`} className="glass-card quiz-card quiz-card-link">
      <h2 className="quiz-card-title">{quiz.title}</h2>
      {quiz.description && (
        <p className="quiz-card-description">{quiz.description}</p>
      )}
      <span className="quiz-card-cta">Open quiz →</span>
    </Link>
  );
}
