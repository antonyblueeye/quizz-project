"use client";

import { useEffect, useState } from "react";

const PLACE_ICONS = {
  ресторан: "🍽️",
  отель: "🏨",
  аэропорт: "✈️",
  аптека: "💊",
  "фитнес-клуб": "🏋️",
  автомойка: "🚿",
  зоопарк: "🦁",
  больница: "🏥",
  супермаркет: "🛒",
  кинотеатр: "🎬",
};

function placeIcon(name) {
  return PLACE_ICONS[String(name).toLowerCase()] || "📍";
}

function ReviewImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="review-match-image-placeholder">
        <span>Скрин отзыва</span>
        <small>{src ? `Добавьте файл в public${src}` : "Нет изображения"}</small>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Отзыв"}
      className="review-match-image"
      onError={() => setFailed(true)}
    />
  );
}

function PlayerTurnBadge({ player }) {
  if (!player) {
    return <p className="review-match-no-player">Добавьте игроков, чтобы начать раунд</p>;
  }

  return (
    <div className="review-match-turn">
      {player.avatar ? (
        <img src={player.avatar} alt="" className="review-match-turn-avatar" />
      ) : (
        <span className="review-match-turn-avatar review-match-turn-avatar-fallback">
          {player.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div>
        <span className="review-match-turn-label">Сейчас ход</span>
        <strong className="review-match-turn-name">{player.name}</strong>
      </div>
    </div>
  );
}

function FeedbackToast({ feedback, onDone }) {
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [feedback, onDone]);

  if (!feedback) return null;

  return (
    <div
      className={`review-match-feedback${feedback.correct ? " review-match-feedback--ok" : " review-match-feedback--bad"}`}
    >
      <span className="review-match-feedback-title">
        {feedback.correct ? "Верно!" : "Мимо"}
      </span>
      <p>
        {feedback.playerName} → <strong>{feedback.pickedPlace}</strong>
      </p>
      {!feedback.correct && (
        <p className="review-match-feedback-answer">
          Правильно: {feedback.correctAnswer}
        </p>
      )}
    </div>
  );
}

export default function ReviewMatchPanel({
  data,
  onPick,
  disabled = false,
  showMeta = true,
}) {
  const [feedbackVisible, setFeedbackVisible] = useState(null);

  useEffect(() => {
    if (data?.lastFeedback) {
      setFeedbackVisible(data.lastFeedback);
    }
  }, [data?.lastFeedback, data?.reviewNumber]);

  if (!data) return null;

  if (data.reviewMode && data.summaryItems) {
    return (
      <section className="review-match-panel review-match-panel--summary">
        {showMeta && (
          <p className="question-meta">
            Разбор · Раунд {data.round} · {data.roundTitle}
          </p>
        )}
        <h2 className="review-match-title">{data.text}</h2>
        <ul className="review-match-summary-grid">
          {data.summaryItems.map((item) => (
            <li
              key={item.reviewNumber}
              className={`review-match-summary-card${item.correct ? " review-match-summary-card--ok" : " review-match-summary-card--bad"}`}
            >
              <ReviewImage src={item.image} alt={`Отзыв ${item.reviewNumber}`} />
              <div className="review-match-summary-body">
                <span className="review-match-review-num">#{item.reviewNumber}</span>
                <p className="review-match-summary-place">
                  {placeIcon(item.correctAnswer)} {item.correctAnswer}
                </p>
                {item.playerName ? (
                  <p className="review-match-summary-pick">
                    {item.playerName}: «{item.pickedPlace}»
                    {item.correct ? " ✓" : " ✗"}
                  </p>
                ) : (
                  <p className="review-match-summary-pick">Без ответа</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const canPick = !disabled && data.isYourTurn;

  return (
    <section className="review-match-panel">
      {showMeta && (
        <p className="question-meta">
          Раунд {data.round} · Отзыв {data.reviewNumber} из {data.totalReviews}
        </p>
      )}

      <div className="review-match-layout">
        <div className="review-match-main">
          <PlayerTurnBadge player={data.activePlayer} />

          <div className="review-match-review-card">
            <span className="review-match-review-badge">Отзыв {data.reviewNumber}</span>
            <ReviewImage src={data.image} alt={`Отзыв ${data.reviewNumber}`} />
          </div>

          <p className="review-match-hint">
            {canPick
              ? "Выберите место, которому соответствует этот отзыв"
              : data.isYourTurn
                ? "Вы уже ответили — ждите следующий отзыв"
                : `Ждём ответ от ${data.activePlayer?.name || "игрока"}…`}
          </p>

          <div className="review-match-places">
            {data.places.map((place) => {
              const isAvailable = !place.used && canPick;
              return (
                <button
                  key={place.name}
                  type="button"
                  className={`review-match-place${place.used ? " review-match-place--used" : ""}${place.used && place.correct ? " review-match-place--correct" : ""}${place.used && place.correct === false ? " review-match-place--wrong" : ""}${isAvailable ? " review-match-place--active" : ""}`}
                  disabled={!isAvailable}
                  onClick={() => onPick?.(place.name)}
                >
                  <span className="review-match-place-icon">{placeIcon(place.name)}</span>
                  <span className="review-match-place-name">{place.name}</span>
                  {place.used && (
                    <span className="review-match-place-meta">
                      {place.pickedBy}
                      {place.correct ? " ✓" : " ✗"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {data.matchHistory?.length > 0 && (
          <aside className="review-match-history">
            <h3 className="review-match-history-title">Уже сопоставлено</h3>
            <ul className="review-match-history-list">
              {[...data.matchHistory].reverse().map((item) => (
                <li
                  key={`${item.reviewNumber}-${item.pickedPlace}`}
                  className={`review-match-history-item${item.correct ? " review-match-history-item--ok" : " review-match-history-item--bad"}`}
                >
                  <span className="review-match-history-num">#{item.reviewNumber}</span>
                  <div>
                    <strong>{item.playerName}</strong>
                    <span> → {item.pickedPlace}</span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <FeedbackToast
        feedback={feedbackVisible}
        onDone={() => setFeedbackVisible(null)}
      />
    </section>
  );
}
