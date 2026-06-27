const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// process.cwd() — единый путь и для server.js, и для Next.js API routes
const GAMES_DIR = path.join(process.cwd(), "data", "games");
const INDEX_PATH = path.join(GAMES_DIR, "index.json");

function ensureDir() {
  if (!fs.existsSync(GAMES_DIR)) {
    fs.mkdirSync(GAMES_DIR, { recursive: true });
  }
}

function readIndex() {
  ensureDir();
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeIndex(index) {
  ensureDir();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

function gameFilePath(gameId) {
  return path.join(GAMES_DIR, `${gameId}.json`);
}

function formatGameTitle(isoOrDate) {
  return new Date(isoOrDate).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProgressLabel(game) {
  if (game.status === "finished" || game.phase === "finished") {
    return "Квиз завершён";
  }
  if (!game.started || game.phase === "idle") {
    return "Лобби — ожидание старта";
  }

  const roundIndex = game.currentRoundIndex ?? 0;
  const round = game.rounds?.[roundIndex];
  const roundNum = roundIndex + 1;
  const totalRounds = game.rounds?.length || 0;
  const roundTitle = round?.title || `Раунд ${roundNum}`;

  switch (game.phase) {
    case "question": {
      const qNum = (game.currentQuestionIndex ?? 0) + 1;
      const totalQ = round?.questions?.length || 0;
      if (round?.type === "reviewmatch") {
        return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · отзыв ${qNum}/${totalQ}`;
      }
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · вопрос ${qNum}/${totalQ}`;
    }
    case "round_complete":
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · раунд завершён`;
    case "round_review":
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · разбор ответов`;
    case "match_reveal":
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · результаты ответа`;
    case "round_leaderboard":
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · рейтинг`;
    case "round_intro":
      return `Раунд ${roundNum}/${totalRounds}: ${roundTitle} · перед стартом`;
    default:
      return roundTitle;
  }
}

function buildMeta(game) {
  const roundIndex = game.currentRoundIndex ?? 0;
  const round = game.rounds?.[roundIndex];
  return {
    gameId: game.gameId,
    quizTemplateId: game.quizTemplateId,
    title: formatGameTitle(game.createdAt),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    status: game.status,
    playerCount: Object.keys(game.players || {}).length,
    started: game.started,
    phase: game.phase,
    currentRound: game.started ? roundIndex + 1 : null,
    currentRoundTitle: round?.title || null,
    totalRounds: game.rounds?.length || 0,
    progressLabel: getProgressLabel(game),
  };
}

function loadGame(gameId) {
  ensureDir();
  const filePath = gameFilePath(gameId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

const MAX_PERSISTED_AVATAR_CHARS = 32_000;

function trimAvatar(avatar) {
  if (!avatar || typeof avatar !== "string") return null;
  if (avatar.length > MAX_PERSISTED_AVATAR_CHARS) return null;
  return avatar;
}

function slimPlayerRef(player) {
  if (!player) return player;
  return {
    id: player.id,
    name: player.name,
    avatar: trimAvatar(player.avatar),
  };
}

function slimRoundAnswersForDisk(roundAnswers) {
  if (!roundAnswers) return roundAnswers;

  const slimPlayers = (list) =>
    Array.isArray(list) ? list.map((p) => slimPlayerRef(p)) : list;

  const slim = {};
  for (const [key, breakdown] of Object.entries(roundAnswers)) {
    if (!breakdown || typeof breakdown !== "object") {
      slim[key] = breakdown;
      continue;
    }

    const next = { ...breakdown };

    if (Array.isArray(next.closestWinners)) {
      next.closestWinners = slimPlayers(next.closestWinners);
    }
    if (Array.isArray(next.allAnswers)) {
      next.allAnswers = next.allAnswers.map((row) => ({
        ...row,
        avatar: trimAvatar(row.avatar),
      }));
    }
    if (Array.isArray(next.cityCorrectPlayers)) {
      next.cityCorrectPlayers = slimPlayers(next.cityCorrectPlayers);
    }
    if (Array.isArray(next.countryCorrectPlayers)) {
      next.countryCorrectPlayers = slimPlayers(next.countryCorrectPlayers);
    }
    if (Array.isArray(next.cityGroups)) {
      next.cityGroups = next.cityGroups.map((g) => ({
        ...g,
        players: slimPlayers(g.players),
      }));
    }
    if (Array.isArray(next.countryGroups)) {
      next.countryGroups = next.countryGroups.map((g) => ({
        ...g,
        players: slimPlayers(g.players),
      }));
    }
    if (Array.isArray(next.optionPlayers)) {
      next.optionPlayers = next.optionPlayers.map((g) => ({
        ...g,
        players: slimPlayers(g.players),
      }));
    }
    if (Array.isArray(next.answerGroups)) {
      next.answerGroups = next.answerGroups.map((g) => ({
        ...g,
        players: slimPlayers(g.players),
      }));
    }

    slim[key] = next;
  }
  return slim;
}

function slimGameForDisk(game) {
  const players = {};
  for (const [id, player] of Object.entries(game.players || {})) {
    players[id] = {
      ...player,
      avatar: trimAvatar(player.avatar),
    };
  }

  return {
    ...game,
    players,
    roundAnswers: slimRoundAnswersForDisk(game.roundAnswers),
  };
}

function saveGame(game) {
  ensureDir();
  game.updatedAt = new Date().toISOString();
  const payload = slimGameForDisk(game);
  const filePath = gameFilePath(game.gameId);
  const tmpPath = `${filePath}.tmp`;
  const body = JSON.stringify(payload, null, 2);

  try {
    fs.writeFileSync(tmpPath, body, "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore cleanup errors */
    }
    throw err;
  }

  const index = readIndex();
  const meta = buildMeta(game);
  const withoutDupes = index.filter((g) => g.gameId !== game.gameId);
  withoutDupes.unshift(meta);
  writeIndex(withoutDupes);
}

function rebuildIndexFromDisk() {
  ensureDir();
  const files = fs
    .readdirSync(GAMES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "index.json");

  const seen = new Set();
  const index = [];

  for (const file of files) {
    const gameId = file.replace(/\.json$/, "");
    if (seen.has(gameId)) continue;
    const game = loadGame(gameId);
    if (!game?.gameId) continue;
    seen.add(game.gameId);
    index.push(buildMeta(game));
  }

  index.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  writeIndex(index);
  return index;
}

function listGames(quizTemplateId, { rebuild = false } = {}) {
  let index = rebuild ? rebuildIndexFromDisk() : readIndex();
  if (!index.length) {
    index = rebuildIndexFromDisk();
  } else if (!rebuild) {
    index = index.filter((entry) => {
      if (!entry?.gameId) return false;
      return fs.existsSync(gameFilePath(entry.gameId));
    });
    if (!index.length) {
      index = rebuildIndexFromDisk();
    }
  }
  if (quizTemplateId) {
    index = index.filter((g) => g.quizTemplateId === quizTemplateId);
  }
  return index;
}

function deleteGame(gameId) {
  ensureDir();
  const filePath = gameFilePath(gameId);
  if (!fs.existsSync(filePath)) {
    rebuildIndexFromDisk();
    return false;
  }

  fs.unlinkSync(filePath);
  rebuildIndexFromDisk();
  return true;
}

function createGame(quizTemplateId, quizData) {
  const gameId = uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  const game = {
    gameId,
    quizTemplateId,
    title: formatGameTitle(now),
    createdAt: now,
    updatedAt: now,
    status: "lobby",
    players: {},
    rounds: quizData.rounds.map((round) => ({
      ...round,
      questions: round.questions.map((q) => ({ ...q })),
    })),
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    reviewQuestionIndex: 0,
    phase: "idle",
    started: false,
    roundAnswers: {},
    history: [{ type: "created", at: now }],
  };
  saveGame(game);
  return game;
}

function appendHistory(game, event) {
  if (!game.history) game.history = [];
  game.history.push({ ...event, at: new Date().toISOString() });
}

module.exports = {
  loadGame,
  saveGame,
  listGames,
  createGame,
  deleteGame,
  rebuildIndexFromDisk,
  appendHistory,
  buildMeta,
  formatGameTitle,
};
