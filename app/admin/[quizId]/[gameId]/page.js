import AdminDashboard from "../../../../components/AdminDashboard.jsx";

export const metadata = {
  title: "Admin — Game",
};

export default async function AdminGamePage({ params }) {
  const { quizId, gameId } = await params;
  return <AdminDashboard gameId={gameId} quizTemplateId={quizId} />;
}
