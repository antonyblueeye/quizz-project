"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getSocket, emitWhenReady } from "../lib/socket";
import { QUESTION_TIME_SECONDS } from "../lib/gameConfig";
import { compressAvatarFile } from "../lib/compressAvatar";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Leaderboard from "./Leaderboard";
import RoundIntroPanel from "./RoundIntroPanel";
import ReviewMatchPanel from "./ReviewMatchPanel";

function playerStorageKey(gameId) {
  return `quiz-player-${gameId}`;
}

function applySessionSync(snap, setters) {
  const {
    setQuestion,
    setRoundIntro,
    setRoundBreak,
    setMatchReveal,
    setRoundLeaderboard,
    setFinalLeaderboard,
    setTimeLeft,
    setAnswered,
    setStatusMsg,
  } = setters;

  if (snap.currentQuestion) {
    const q = snap.currentQuestion;
    setQuestion(q);
    setRoundIntro(null);
    setRoundBreak(null);
    setMatchReveal(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(QUESTION_TIME_SECONDS);
    setAnswered(Boolean(snap.playerAnswered));
    setStatusMsg(snap.playerAnswered ? "Ответ принят" : "");
  } else if (snap.matchReveal) {
    setQuestion(null);
    setRoundIntro(null);
    setRoundBreak(null);
    setMatchReveal(snap.matchReveal);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else if (snap.roundIntro) {
    setQuestion(null);
    setRoundIntro(snap.roundIntro);
    setRoundBreak(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else if (snap.reviewQuestion) {
    setRoundIntro(null);
    setQuestion(null);
    setRoundBreak({
      type: "review",
      round: snap.reviewQuestion.round,
      roundTitle: snap.reviewQuestion.roundTitle,
    });
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else if (snap.roundComplete) {
    setRoundIntro(null);
    setQuestion(null);
    setRoundBreak({ type: "complete", ...snap.roundComplete });
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else if (snap.roundLeaderboard) {
    setRoundIntro(null);
    setQuestion(null);
    setRoundBreak(null);
    setRoundLeaderboard(snap.roundLeaderboard);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else if (snap.finalLeaderboard) {
    setQuestion(null);
    setRoundBreak(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(snap.finalLeaderboard);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  } else {
    setRoundIntro(null);
    setQuestion(null);
    setRoundBreak(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
    setAnswered(false);
    setStatusMsg("");
  }
}

export default function PlayDashboard({ gameId }) {
  const socket = getSocket();

  const [authState, setAuthState] = useState("checking");
  const [socketReady, setSocketReady] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [question, setQuestion] = useState(null);
  const [roundIntro, setRoundIntro] = useState(null);
  const [roundBreak, setRoundBreak] = useState(null);
  const [matchReveal, setMatchReveal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [roundLeaderboard, setRoundLeaderboard] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  const syncSetters = {
    setQuestion,
    setRoundIntro,
    setRoundBreak,
    setMatchReveal,
    setRoundLeaderboard,
    setFinalLeaderboard,
    setTimeLeft,
    setAnswered,
    setStatusMsg,
  };

  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError("");
    setAvatarProcessing(true);

    try {
      const compressed = await compressAvatarFile(file);
      setAvatar(compressed);
      setAvatarPreview(compressed);
    } catch (err) {
      setAvatar(null);
      setAvatarPreview(null);
      setAvatarError(err.message || "Не удалось обработать фото");
    } finally {
      setAvatarProcessing(false);
      e.target.value = "";
    }
  }, []);

  const handleJoin = useCallback(
    (e) => {
      e.preventDefault();
      if (!playerName.trim() || joinPending) return;
      setJoinError("");
      setJoinPending(true);
      emitWhenReady(socket, "joinQuiz", {
        gameId,
        playerName: playerName.trim(),
        avatar: avatar || null,
      });
    },
    [socket, gameId, playerName, avatar, joinPending]
  );

  useEffect(() => {
    const onConnect = () => {
      setSocketReady(true);
      setJoinError("");
      const savedPlayerId = localStorage.getItem(playerStorageKey(gameId));
      if (savedPlayerId) {
        emitWhenReady(socket, "rejoinGame", { gameId, playerId: savedPlayerId });
      }
    };
    const onDisconnect = () => setSocketReady(false);
    const onConnectError = () => {
      setSocketReady(false);
      setJoinError("Нет связи с сервером. Проверьте, что игра запущена на сервере.");
      setJoinPending(false);
      setAuthState((prev) => (prev === "checking" ? "guest" : prev));
    };

    const onJoined = ({ playerId: pid }) => {
      setPlayerId(pid);
      setAuthState("joined");
      setJoinPending(false);
      setJoinError("");
      localStorage.setItem(playerStorageKey(gameId), pid);
    };
    const onRejoinFailed = () => {
      localStorage.removeItem(playerStorageKey(gameId));
      setAuthState("guest");
      setJoinPending(false);
    };
    const onJoinFailed = ({ message }) => {
      setJoinError(message || "Не удалось войти");
      setJoinPending(false);
    };
    const onRoundIntro = (intro) => {
      setQuestion(null);
      setRoundIntro(intro);
      setRoundBreak(null);
      setMatchReveal(null);
      setRoundLeaderboard(null);
      setTimeLeft(0);
      setAnswered(false);
      setStatusMsg("");
    };
    const onQuestion = (q) => {
      setRoundIntro(null);
      setQuestion(q);
      setRoundBreak(null);
      setMatchReveal(null);
      setRoundLeaderboard(null);
      setTimeLeft(QUESTION_TIME_SECONDS);
      setAnswered(false);
      setStatusMsg("");
    };
    const onMatchReveal = (payload) => {
      setQuestion(null);
      setRoundBreak(null);
      setMatchReveal(payload);
      setRoundLeaderboard(null);
      setTimeLeft(0);
      setAnswered(false);
      setStatusMsg("");
    };
    const onRoundComplete = (payload) => {
      setQuestion(null);
      setMatchReveal(null);
      setRoundBreak({ type: "complete", ...payload });
      setRoundLeaderboard(null);
      setTimeLeft(0);
    };
    const onAnswerReview = (q) => {
      setQuestion(null);
      setRoundBreak({
        type: "review",
        round: q.round,
        roundTitle: q.roundTitle,
      });
      setRoundLeaderboard(null);
      setTimeLeft(0);
    };
    const onRoundLeaderboard = (payload) => {
      setQuestion(null);
      setRoundBreak(null);
      setTimeLeft(0);
      setRoundLeaderboard(payload);
    };
    const onQuizFinished = ({ leaderboard }) => {
      setQuestion(null);
      setRoundLeaderboard(null);
      setFinalLeaderboard(leaderboard);
    };
    const onSessionSync = (snap) => {
      applySessionSync(snap, syncSetters);
    };

    socket.on("joined", onJoined);
    socket.on("rejoinFailed", onRejoinFailed);
    socket.on("joinFailed", onJoinFailed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("sessionSync", onSessionSync);
    socket.on("roundIntro", onRoundIntro);
    socket.on("question", onQuestion);
    socket.on("matchReveal", onMatchReveal);
    socket.on("roundComplete", onRoundComplete);
    socket.on("answerReview", onAnswerReview);
    socket.on("roundLeaderboard", onRoundLeaderboard);
    socket.on("quizFinished", onQuizFinished);

    if (socket.connected) setSocketReady(true);

    const savedPlayerId = localStorage.getItem(playerStorageKey(gameId));
    if (savedPlayerId) {
      emitWhenReady(socket, "rejoinGame", { gameId, playerId: savedPlayerId });
    } else {
      setAuthState("guest");
    }

    const rejoinTimeout = setTimeout(() => {
      setAuthState((prev) => (prev === "checking" ? "guest" : prev));
      setJoinPending(false);
    }, 4000);

    return () => {
      clearTimeout(rejoinTimeout);
      socket.off("joined", onJoined);
      socket.off("rejoinFailed", onRejoinFailed);
      socket.off("joinFailed", onJoinFailed);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("sessionSync", onSessionSync);
      socket.off("roundIntro", onRoundIntro);
      socket.off("question", onQuestion);
      socket.off("matchReveal", onMatchReveal);
      socket.off("roundComplete", onRoundComplete);
      socket.off("answerReview", onAnswerReview);
      socket.off("roundLeaderboard", onRoundLeaderboard);
      socket.off("quizFinished", onQuizFinished);
    };
  }, [socket, gameId, playerId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswer = useCallback(
    (answer) => {
      if (authState !== "joined" || !question) return;

      if (question.type === "reviewmatch") {
        if (answered || timeLeft <= 0) return;
        socket.emit("submitAnswer", { gameId, playerId, answer });
        setAnswered(true);
        setStatusMsg("Выбор отправлен");
        return;
      }

      if (answered || timeLeft <= 0) return;
      socket.emit("submitAnswer", { gameId, playerId, answer });
      setAnswered(true);
      setStatusMsg("Ответ принят");
    },
    [socket, gameId, playerId, authState, answered, question, timeLeft]
  );

  const handleMatchPick = useCallback(
    (place) => handleAnswer(place),
    [handleAnswer]
  );

  if (authState === "checking") {
    return (
      <main className="glass-card play-card play-waiting">
        <h1>Восстанавливаем сессию…</h1>
      </main>
    );
  }

  if (authState === "guest") {
    return (
      <main className="glass-card play-card">
        <h1>Присоединиться к игре</h1>
        <p className="play-wait-hint">Игра #{gameId}</p>
        {!socketReady && (
          <p className="play-wait-hint">Подключение к серверу…</p>
        )}
        <form onSubmit={handleJoin} className="play-join-form">
          <label className="play-avatar-label">
            Аватар (необязательно)
            <span className="play-wait-hint">Любое фото — сожмём автоматически</span>
            <div className="play-avatar-picker">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="play-avatar-preview" />
              ) : (
                <span className="play-avatar-placeholder">{avatarProcessing ? "…" : "+"}</span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="play-avatar-input"
                disabled={avatarProcessing}
              />
            </div>
          </label>
          {avatarProcessing && <p className="play-wait-hint">Сжимаем фото…</p>}
          {avatarError && <p className="play-avatar-error">{avatarError}</p>}
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ваше имя"
            className="question-text-input"
            autoComplete="name"
          />
          {joinError && <p className="play-avatar-error">{joinError}</p>}
          <button type="submit" className="button" disabled={joinPending || !socketReady}>
            {joinPending ? "Входим…" : "Войти"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="glass-card play-card">
      {finalLeaderboard ? (
        <section>
          <h1>Квиз завершён!</h1>
          <Leaderboard data={finalLeaderboard} title="Итоговый рейтинг" />
        </section>
      ) : roundLeaderboard ? (
        <section>
          <h1>Раунд {roundLeaderboard.round} завершён</h1>
          <p className="play-wait-hint">
            {roundLeaderboard.step === "round"
              ? "Рейтинг за этот раунд"
              : "Общий рейтинг за все пройденные раунды"}
          </p>
          <Leaderboard
            data={roundLeaderboard.leaderboard}
            title={
              roundLeaderboard.step === "round"
                ? `Раунд ${roundLeaderboard.round}: ${roundLeaderboard.roundTitle}`
                : `Общий рейтинг · ${roundLeaderboard.round} раундов`
            }
          />
        </section>
      ) : matchReveal ? (
        <section>
          <h1 className="play-round-title">{matchReveal.roundTitle}</h1>
          <ReviewMatchPanel data={matchReveal} disabled showMeta={false} />
          <p className="play-wait-hint">Ждите следующий отзыв…</p>
        </section>
      ) : roundBreak ? (
        <section className="play-waiting">
          <h1>Раунд {roundBreak.round} завершён</h1>
          <p className="play-wait-hint">
            {roundBreak.type === "review"
              ? "Ведущий показывает правильные ответы…"
              : "Скоро разбор ответов…"}
          </p>
        </section>
      ) : roundIntro ? (
        <section className="round-intro-screen-wrap">
          <RoundIntroPanel intro={roundIntro} variant="screen" />
        </section>
      ) : question ? (
        <section>
          <h1 className="play-round-title">{question.roundTitle}</h1>
          {question.type === "reviewmatch" ? (
            <>
              <Timer seconds={timeLeft} total={QUESTION_TIME_SECONDS} />
              <ReviewMatchPanel
                data={question}
                onPick={handleMatchPick}
                disabled={answered || timeLeft <= 0}
              />
              {timeLeft <= 0 && !answered && (
                <p className="play-time-up">Время вышло</p>
              )}
              {statusMsg && <p className="play-status-msg">{statusMsg}</p>}
            </>
          ) : (
            <>
              <Timer seconds={timeLeft} total={QUESTION_TIME_SECONDS} />
              <QuestionCard
                question={question}
                onSubmit={handleAnswer}
                disabled={answered || timeLeft <= 0}
              />
              {timeLeft <= 0 && !answered && (
                <p className="play-time-up">Время вышло</p>
              )}
              {statusMsg && <p className="play-status-msg">{statusMsg}</p>}
            </>
          )}
        </section>
      ) : (
        <section className="play-waiting">
          <h1>Вы в игре</h1>
          <p className="play-wait-hint">Ждите старта квиза от ведущего…</p>
        </section>
      )}
    </main>
  );
}
