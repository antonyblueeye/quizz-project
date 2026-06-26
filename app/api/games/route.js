const { loadQuizTemplate } = require("../../../utils/loadQuizTemplate");
const persistence = require("../../../utils/persistence");
const store = require("../../../utils/store");

const recentCreates = new Map();
const CREATE_DEDUPE_MS = 60_000;

function pruneRecentCreates() {
  const cutoff = Date.now() - CREATE_DEDUPE_MS;
  for (const [key, entry] of recentCreates) {
    if (entry.at < cutoff) recentCreates.delete(key);
  }
}

function getRecentCreate(quizTemplateId, clientToken) {
  if (!clientToken) return null;
  pruneRecentCreates();
  const entry = recentCreates.get(`${quizTemplateId}:${clientToken}`);
  if (!entry) return null;
  const game = persistence.loadGame(entry.gameId);
  return game ? persistence.buildMeta(game) : null;
}

function rememberCreate(quizTemplateId, clientToken, gameId) {
  if (!clientToken) return;
  recentCreates.set(`${quizTemplateId}:${clientToken}`, {
    gameId,
    at: Date.now(),
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const quizTemplateId = searchParams.get("quizId") || undefined;
  const games = persistence.listGames(quizTemplateId);
  return Response.json({ games });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const quizTemplateId = body.quizTemplateId || body.quizId;
    const clientToken = body.clientToken || null;
    if (!quizTemplateId) {
      return Response.json({ error: "quizTemplateId required" }, { status: 400 });
    }

    const existing = getRecentCreate(quizTemplateId, clientToken);
    if (existing) {
      store.registerGame(persistence.loadGame(existing.gameId));
      return Response.json({ game: existing, reused: true });
    }

    const quizData = loadQuizTemplate(quizTemplateId);
    const game = persistence.createGame(quizTemplateId, quizData);
    rememberCreate(quizTemplateId, clientToken, game.gameId);
    store.registerGame(persistence.loadGame(game.gameId));
    return Response.json({ game: persistence.buildMeta(game) });
  } catch (e) {
    return Response.json({ error: "Failed to create game" }, { status: 500 });
  }
}
