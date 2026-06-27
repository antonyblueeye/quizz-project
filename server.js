// server.js - custom Next.js server with Socket.io integration

const { createServer } = require("http");
const next = require("next");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const quizDataPath = path.join(__dirname, "app", "data", "quiz.json");
let quizData = { rounds: [] };
try {
  const raw = fs.readFileSync(quizDataPath, "utf-8");
  quizData = JSON.parse(raw);
  const totalQuestions = quizData.rounds.reduce(
    (sum, r) => sum + r.questions.length,
    0
  );
  console.log(
    `✅ Loaded ${quizData.rounds.length} rounds, ${totalQuestions} questions`
  );
} catch (e) {
  console.error("⚠️ Failed to load quiz data:", e);
}

const store = require("./utils/store");

app.prepare().then(() => {
  store.loadAllGamesIntoMemory();
  console.log("✅ Restored active games from disk");

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = socketIo(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connection", socket.id);

    socket.on("adminInit", ({ gameId }) => {
      let sess = store.ensureGame(gameId);
      if (!sess) {
        socket.emit("adminInitFailed", {
          message: "Игра не найдена. Создайте новую игру в истории.",
        });
        return;
      }
      socket.join(gameId);
      const snap = store.getSessionSnapshot(gameId);
      socket.emit("playersUpdate", snap.players);
      socket.emit("sessionSync", snap);
    });

    socket.on("joinQuiz", ({ gameId, playerName, avatar }) => {
      if (!gameId) {
        socket.emit("joinFailed", { message: "Неверная ссылка для входа." });
        return;
      }

      let sess = store.ensureGame(gameId);
      if (!sess) {
        socket.emit("joinFailed", {
          message: "Игра не найдена. Откройте актуальную ссылку от ведущего.",
        });
        return;
      }
      if (sess.phase === "finished") {
        socket.emit("joinFailed", { message: "Эта игра уже завершена." });
        return;
      }

      const playerId = store.addPlayer(gameId, playerName, socket.id, avatar);
      if (!playerId) {
        socket.emit("joinFailed", { message: "Не удалось войти в игру." });
        return;
      }
      socket.join(gameId);
      io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
      socket.emit("joined", { playerId, gameId });
      socket.emit("sessionSync", store.getPlayerSessionSnapshot(gameId, playerId));
    });

    socket.on("rejoinGame", ({ gameId, playerId }) => {
      const ok = store.rejoinPlayer(gameId, playerId, socket.id);
      if (!ok) {
        socket.emit("rejoinFailed", { gameId });
        return;
      }
      socket.join(gameId);
      io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
      socket.emit("joined", { playerId, gameId });
      socket.emit("sessionSync", store.getPlayerSessionSnapshot(gameId, playerId));
    });

    socket.on("startQuiz", ({ gameId }, cb) => {
      const session = store.startQuiz(gameId);
      if (!session) {
        socket.emit("error", { message: "Unable to start quiz" });
        if (typeof cb === "function") cb(null);
        return;
      }
      io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
      io.to(gameId).emit("roundIntro", session.roundIntro);
      if (typeof cb === "function") cb(session);
    });

    socket.on("submitAnswer", ({ gameId, playerId, answer }) => {
      const sess = store.ensureGame(gameId);
      const round = sess?.rounds[sess.currentRoundIndex];

      if (round?.type === "reviewmatch" && sess?.phase === "question") {
        const result = store.recordMatchAnswer(gameId, playerId, answer);
        if (result?.ok) {
          io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
          if (result.roundComplete) {
            io.to(gameId).emit("roundComplete", result.roundComplete);
          } else if (result.currentQuestion) {
            io.to(gameId).emit("question", result.currentQuestion);
          }
        }
        return;
      }

      let ok = store.recordAnswer(gameId, playerId, answer);
      if (!ok) {
        ok = store.recordAnswerBySocket(gameId, socket.id, answer);
      }
      if (ok) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
      }
    });

    socket.on("nextQuestion", ({ gameId }, cb) => {
      const result = store.advanceQuestion(gameId);

      if (result.final) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("quizFinished", {
          leaderboard: result.leaderboard,
        });
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.roundComplete) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("roundComplete", {
          round: result.round,
          roundTitle: result.roundTitle,
        });
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.reviewQuestion) {
        io.to(gameId).emit("answerReview", result.reviewQuestion);
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.roundEnd) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("roundLeaderboard", result.roundLeaderboard);
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.roundLeaderboard) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("roundLeaderboard", result.roundLeaderboard);
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.roundIntro) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("roundIntro", result.roundIntro);
        if (typeof cb === "function") cb(result);
        return;
      }

      if (result.currentQuestion) {
        io.to(gameId).emit("playersUpdate", store.getPlayers(gameId));
        io.to(gameId).emit("question", result.currentQuestion);
      }

      if (typeof cb === "function") cb(result);
    });

    socket.on("disconnect", () => {
      const detached = store.detachSocket(socket.id);
      if (detached?.gameId) {
        io.to(detached.gameId).emit("playersUpdate", store.getPlayers(detached.gameId));
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
