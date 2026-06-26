"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import QuestionCard from "./QuestionCard";
import {
  formatQuestion,
  formatReviewQuestion,
  getQuestionLabel,
  ROUND_TYPE_LABELS,
} from "../utils/quizFormat.js";

export default function QuizStructurePreview({
  quizId,
  quizTitle,
  rounds,
  initialRoundIndex = 0,
  initialQuestionIndex = 0,
}) {
  const [roundIndex, setRoundIndex] = useState(initialRoundIndex);
  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [reviewMode, setReviewMode] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState(() =>
    Object.fromEntries(rounds.map((_, i) => [i, i === initialRoundIndex]))
  );

  const round = rounds[roundIndex];
  const question = round?.questions[questionIndex];

  const previewQuestion = useMemo(() => {
    if (!round || !question) return null;
    return reviewMode
      ? formatReviewQuestion(round, question, questionIndex)
      : formatQuestion(round, question, questionIndex);
  }, [round, question, questionIndex, reviewMode]);

  const selectQuestion = useCallback((ri, qi) => {
    setRoundIndex(ri);
    setQuestionIndex(qi);
    setExpandedRounds((prev) => ({ ...prev, [ri]: true }));
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("round", String(ri + 1));
      url.searchParams.set("q", String(qi + 1));
      window.history.replaceState(null, "", url);
    }
  }, []);

  const toggleRound = (ri) => {
    setExpandedRounds((prev) => ({ ...prev, [ri]: !prev[ri] }));
  };

  const goPrev = () => {
    if (questionIndex > 0) {
      selectQuestion(roundIndex, questionIndex - 1);
    } else if (roundIndex > 0) {
      const prevRound = rounds[roundIndex - 1];
      selectQuestion(roundIndex - 1, prevRound.questions.length - 1);
    }
  };

  const goNext = () => {
    if (questionIndex < round.questions.length - 1) {
      selectQuestion(roundIndex, questionIndex + 1);
    } else if (roundIndex < rounds.length - 1) {
      selectQuestion(roundIndex + 1, 0);
    }
  };

  const canPrev = roundIndex > 0 || questionIndex > 0;
  const canNext =
    roundIndex < rounds.length - 1 ||
    questionIndex < (round?.questions.length ?? 0) - 1;

  return (
    <main className="quiz-preview-page">
      <div className="quiz-preview-topbar">
        <Link href={`/admin/${quizId}`} className="quiz-admin-back">
          ← История игр
        </Link>
        <span className="quiz-preview-badge">Превью · не транслируется игрокам</span>
      </div>

      <header className="quiz-preview-header">
        <h1 className="home-title">{quizTitle || quizId}</h1>
        <p className="home-subtitle">
          Структура квиза — просмотр вопросов без запуска игры
        </p>
      </header>

      <div className="quiz-preview-layout">
        <aside className="quiz-preview-nav glass-card">
          <h2 className="quiz-section-title">Раунды</h2>
          <ul className="quiz-preview-rounds">
            {rounds.map((r, ri) => (
              <li key={r.id} className="quiz-preview-round">
                <button
                  type="button"
                  className={`quiz-preview-round-btn${ri === roundIndex ? " quiz-preview-round-btn--active" : ""}`}
                  onClick={() => toggleRound(ri)}
                  aria-expanded={expandedRounds[ri]}
                >
                  <span className="quiz-preview-round-num">{r.id}</span>
                  <span className="quiz-preview-round-info">
                    <span className="quiz-preview-round-title">{r.title}</span>
                    <span className="quiz-preview-round-meta">
                      {ROUND_TYPE_LABELS[r.type] || r.type} · {r.questions.length} вопр.
                    </span>
                  </span>
                  <span className="quiz-preview-round-chevron">
                    {expandedRounds[ri] ? "▾" : "▸"}
                  </span>
                </button>
                {expandedRounds[ri] && (
                  <ul className="quiz-preview-questions">
                    {r.questions.map((q, qi) => (
                      <li key={qi}>
                        <button
                          type="button"
                          className={`quiz-preview-question-btn${
                            ri === roundIndex && qi === questionIndex
                              ? " quiz-preview-question-btn--active"
                              : ""
                          }`}
                          onClick={() => selectQuestion(ri, qi)}
                        >
                          <span className="quiz-preview-q-num">{qi + 1}</span>
                          <span>{getQuestionLabel(r, q, qi)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <section className="quiz-preview-main glass-card">
          <div className="quiz-preview-toolbar">
            <div className="quiz-preview-mode">
              <button
                type="button"
                className={`quiz-preview-mode-btn${!reviewMode ? " quiz-preview-mode-btn--active" : ""}`}
                onClick={() => setReviewMode(false)}
              >
                Как у игроков
              </button>
              <button
                type="button"
                className={`quiz-preview-mode-btn${reviewMode ? " quiz-preview-mode-btn--active" : ""}`}
                onClick={() => setReviewMode(true)}
              >
                Разбор
              </button>
            </div>
            <div className="quiz-preview-nav-btns">
              <button
                type="button"
                className="button quiz-preview-nav-btn"
                onClick={goPrev}
                disabled={!canPrev}
              >
                ← Пред.
              </button>
              <button
                type="button"
                className="button quiz-preview-nav-btn"
                onClick={goNext}
                disabled={!canNext}
              >
                След. →
              </button>
            </div>
          </div>

          {previewQuestion ? (
            <QuestionCard
              question={previewQuestion}
              onSubmit={() => {}}
              disabled
              showMeta
            />
          ) : (
            <p className="quiz-empty-hint">Выберите вопрос слева</p>
          )}
        </section>
      </div>
    </main>
  );
}
