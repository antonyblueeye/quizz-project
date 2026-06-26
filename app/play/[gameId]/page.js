import PlayDashboard from "../../../components/PlayDashboard.jsx";

export const metadata = {
  title: "Join Game",
};

export default async function PlayPage({ params }) {
  const { gameId } = await params;
  return <PlayDashboard gameId={gameId} />;
}
