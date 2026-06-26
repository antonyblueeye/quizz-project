"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSocket } from "../lib/socket";
import { QRCodeCanvas } from "qrcode.react";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Leaderboard from "./Leaderboard";
import RoundIntroPanel from "./RoundIntroPanel";

function applySessionSync(snap, setters) {
  const {
    setStarted,
    setQuestion,
    setRoundIntro,
    setRoundComplete,
    setReviewQuestion,
    setRoundLeaderboard,
    setFinalLeaderboard,
    setTimeLeft,
  } = setters;

  setStarted(snap.started);
  setRoundComplete(null);
  setReviewQuestion(null);
  setRoundIntro(null);

  if (snap.currentQuestion) {
    setQuestion(snap.currentQuestion);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(60);
  } else if (snap.roundIntro) {
    setQuestion(null);
    setRoundIntro(snap.roundIntro);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  } else if (snap.reviewQuestion) {
    setQuestion(null);
    setReviewQuestion(snap.reviewQuestion);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  } else if (snap.roundComplete) {
    setQuestion(null);
    setRoundComplete(snap.roundComplete);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  } else if (snap.roundLeaderboard) {
    setQuestion(null);
    setRoundLeaderboard(snap.roundLeaderboard);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  } else if (snap.finalLeaderboard) {
    setQuestion(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(snap.finalLeaderboard);
    setTimeLeft(0);
  } else {
    setQuestion(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  }
}

export default function AdminDashboard({ gameId, quizTemplateId }) {
  const socket = getSocket();
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [roundComplete, setRoundComplete] = useState(null);
  const [reviewQuestion, setReviewQuestion] = useState(null);
  const [roundIntro, setRoundIntro] = useState(null);
  const [started, setStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState("lobby");
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundLeaderboard, setRoundLeaderboard] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [adminError, setAdminError] = useState("");
  const [gameTitle, setGameTitle] = useState("");

  useEffect(() => {
    fetch(`/api/games/${gameId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.game?.title) setGameTitle(data.game.title);
      })
      .catch(() => {});
  }, [gameId]);

  const syncSetters = {
    setStarted,
    setQuestion,
    setRoundIntro,
    setRoundComplete,
    setReviewQuestion,
    setRoundLeaderboard,
    setFinalLeaderboard,
    setTimeLeft,
  };

  const applyRoundIntro = useCallback((intro) => {
    if (!intro) return;
    setRoundIntro(intro);
    setStarted(true);
    setGameStatus("active");
    setQuestion(null);
    setRoundComplete(null);
    setReviewQuestion(null);
    setRoundLeaderboard(null);
    setFinalLeaderboard(null);
    setTimeLeft(0);
  }, []);

  useEffect(() => {
    const onRoundIntro = (intro) => {
      applyRoundIntro(intro);
    };
    const onQuestion = (q) => {
      setRoundIntro(null);
      setRoundComplete(null);
      setReviewQuestion(null);
      setRoundLeaderboard(null);
      setQuestion(q);
      setTimeLeft(60);
    };
    const onRoundComplete = (payload) => {
      setQuestion(null);
      setReviewQuestion(null);
      setRoundLeaderboard(null);
      setTimeLeft(0);
      setRoundComplete(payload);
    };
    const onAnswerReview = (q) => {
      setQuestion(null);
      setRoundComplete(null);
      setRoundLeaderboard(null);
      setTimeLeft(0);
      setReviewQuestion(q);
    };
    const onRoundLeaderboard = (payload) => {
      setQuestion(null);
      setRoundIntro(null);
      setRoundComplete(null);
      setReviewQuestion(null);
      setTimeLeft(0);
      setRoundLeaderboard(payload);
    };
    const onQuizFinished = ({ leaderboard }) => {
      setRoundIntro(null);
      setQuestion(null);
      setRoundComplete(null);
      setReviewQuestion(null);
      setTimeLeft(0);
      setRoundLeaderboard(null);
      setFinalLeaderboard(leaderboard);
      setGameStatus("finished");
    };
    const onSessionSync = (snap) => {
      applySessionSync(snap, syncSetters);
      if (snap.status) setGameStatus(snap.status);
    };
    const onAdminInitFailed = ({ message }) => {
      setAdminError(message);
    };

    socket.on("playersUpdate", (list) => setPlayers(list));
    socket.on("sessionSync", onSessionSync);
    socket.on("adminInitFailed", onAdminInitFailed);
    socket.on("roundIntro", onRoundIntro);
    socket.on("question", onQuestion);
    socket.on("roundComplete", onRoundComplete);
    socket.on("answerReview", onAnswerReview);
    socket.on("roundLeaderboard", onRoundLeaderboard);
    socket.on("quizFinished", onQuizFinished);
    socket.emit("adminInit", { gameId });

    return () => {
      socket.off("playersUpdate");
      socket.off("sessionSync", onSessionSync);
      socket.off("adminInitFailed", onAdminInitFailed);
      socket.off("roundIntro", onRoundIntro);
      socket.off("question", onQuestion);
      socket.off("roundComplete", onRoundComplete);
      socket.off("answerReview", onAnswerReview);
      socket.off("roundLeaderboard", onRoundLeaderboard);
      socket.off("quizFinished", onQuizFinished);
    };
  }, [socket, gameId, applyRoundIntro]);

  useEffect(() => {
    if (!started || !question || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [started, question, timeLeft]);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/play/${gameId}`);
  }, [gameId]);

  const handleStart = useCallback(() => {
    socket.emit("startQuiz", { gameId }, (session) => {
      if (session?.roundIntro) {
        applyRoundIntro(session.roundIntro);
      }
    });
  }, [socket, gameId, applyRoundIntro]);

  const handleNext = useCallback(() => {
    if (question) setTimeLeft(60);
    socket.emit("nextQuestion", { gameId });
  }, [socket, gameId, question]);

  const handleCopyLink = useCallback(async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
  }, [joinUrl]);

  const isFinished = gameStatus === "finished" || Boolean(finalLeaderboard);
  const answeredCount = players.filter((p) => p.answered).length;

  const nextButtonLabel = roundIntro
    ? "Начать раунд"
    : roundLeaderboard
    ? roundLeaderboard.isLastRound
      ? "Завершить квиз"
      : "Следующий раунд"
    : reviewQuestion
      ? reviewQuestion.questionNumber >= reviewQuestion.totalInRound
        ? "Показать рейтинг"
        : "Следующий ответ"
      : roundComplete
        ? "Перейти к ответам"
        : "Следующий вопрос";

  return (
    <main className="quiz-admin-page">
      <Link href={`/admin/${quizTemplateId}`} className="quiz-admin-back">
        ← История игр
      </Link>
      <Link href={`/admin/${quizTemplateId}/preview`} className="quiz-admin-preview-link">
        Структура и превью
      </Link>

      <div className="glass-card quiz-admin-card">
        {adminError && <p className="play-avatar-error">{adminError}</p>}
        <header className="quiz-admin-header">
          <div>
            <h1 className="quiz-admin-title">{gameTitle || "Загрузка…"}</h1>
            <p className="quiz-game-id-hint">Игра #{gameId} · прогресс сохраняется при перезагрузке</p>
          </div>
          {!started && !isFinished && (
            <button type="button" className="button" onClick={handleStart}>
              Старт квиза
            </button>
          )}
          {started && !isFinished && (
            <span className="quiz-admin-badge">В эфире</span>
          )}
          {isFinished && (
            <span className="quiz-admin-badge quiz-admin-badge-finished">Завершён</span>
          )}
        </header>

        {joinUrl && !started && !isFinished && (
          <section className="quiz-join-section">
            <h2 className="quiz-section-title">Подключение игроков</h2>
            <p className="quiz-join-hint">Ссылка или QR-код для этой игры.</p>
            <div className="quiz-join-content">
              <QRCodeCanvas value={joinUrl} size={180} level="M" className="quiz-join-qr" />
              <div className="quiz-join-link-wrap">
                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="quiz-join-link">
                  {joinUrl}
                </a>
                <button type="button" className="button quiz-copy-btn" onClick={handleCopyLink}>
                  Копировать ссылку
                </button>
              </div>
            </div>
          </section>
        )}

        {roundIntro ? (
          <RoundIntroPanel
            intro={roundIntro}
            showStartButton
            variant="screen"
            onStart={handleNext}
          />
        ) : (
          <>
        <section className="quiz-players-section">
          <h2 className="quiz-section-title">
            Игроки ({players.length})
            {question && players.length > 0 && (
              <span className="quiz-answers-progress">
                {" "}· {answeredCount}/{players.length} ответили
              </span>
            )}
          </h2>
          {players.length === 0 ? (
            <p className="quiz-empty-hint">Ждём игроков…</p>
          ) : (
            <ul className="quiz-players-list">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={`quiz-player-item${p.answered ? " quiz-player-item--answered" : ""}${!p.online ? " quiz-player-item--offline" : ""}`}
                >
                  {p.avatar ? (
                    <img src={p.avatar} alt="" className="player-avatar" />
                  ) : (
                    <span className="player-avatar player-avatar-fallback">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="quiz-player-name">
                    {p.name}
                    {!p.online && <span className="player-offline-tag"> офлайн</span>}
                  </span>
                  {question && (
                    <span
                      className={`player-answer-status${p.answered ? " player-answer-status--yes" : ""}`}
                      title={p.answered ? "Ответил" : "Ждёт ответа"}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {question && (
          <section className="quiz-game-section">
            <h2 className="quiz-section-title">{question.roundTitle}</h2>
            <Timer seconds={timeLeft} total={60} />
            <QuestionCard question={question} onSubmit={() => {}} disabled />
            <button type="button" className="button quiz-next-btn" onClick={handleNext}>
              {nextButtonLabel}
            </button>
          </section>
        )}

        {roundComplete && (
          <section className="round-complete-panel">
            <h2 className="round-complete-title">Раунд {roundComplete.round} завершён</h2>
            <p className="round-complete-subtitle">{roundComplete.roundTitle}</p>
            <button type="button" className="button quiz-next-btn" onClick={handleNext}>
              Перейти к ответам
            </button>
          </section>
        )}

        {reviewQuestion && (
          <section className="quiz-game-section quiz-review-section">
            <h2 className="quiz-section-title">Разбор ответов · {reviewQuestion.roundTitle}</h2>
            <QuestionCard question={reviewQuestion} onSubmit={() => {}} disabled />
            <button type="button" className="button quiz-next-btn" onClick={handleNext}>
              {nextButtonLabel}
            </button>
          </section>
        )}

        {roundLeaderboard && (
          <section className="quiz-leaderboard-section">
            <Leaderboard
              data={roundLeaderboard.leaderboard}
              title={`Рейтинг после раунда ${roundLeaderboard.round}: ${roundLeaderboard.roundTitle}`}
            />
            <button type="button" className="button quiz-next-btn" onClick={handleNext}>
              {nextButtonLabel}
            </button>
          </section>
        )}

        {finalLeaderboard && (
          <section className="quiz-leaderboard-section">
            <Leaderboard data={finalLeaderboard} title="Итоговый рейтинг" />
          </section>
        )}
          </>
        )}
      </div>
    </main>
  );
}
