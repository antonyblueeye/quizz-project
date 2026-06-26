const persistence = require("../../../../utils/persistence");
const store = require("../../../../utils/store");

export async function GET(_request, { params }) {
  const { gameId } = await params;
  const game = persistence.loadGame(gameId);
  if (!game) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return Response.json({ game: persistence.buildMeta(game) });
}

export async function DELETE(_request, { params }) {
  const { gameId } = await params;
  const deleted = persistence.deleteGame(gameId);
  if (!deleted) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  store.removeGame(gameId);
  return Response.json({ ok: true });
}
