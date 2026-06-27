"use client";

import { useState } from "react";

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

function PlayerAvatars({ players }) {
  if (!players?.length) return null;
  return (
    <div className="review-answer-avatars">
      {players.map((p) =>
        p.avatar ? (
          <img key={p.id} src={p.avatar} alt="" className="player-avatar review-player-avatar" />
        ) : (
          <span
            key={p.id}
            className="player-avatar player-avatar-fallback review-player-avatar"
            title={p.name}
          >
            {p.name.charAt(0).toUpperCase()}
          </span>
        )
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
  if (!data) return null;

  if (data.revealMode) {
    const breakdown = data.answerBreakdown;
    return (
      <section className="review-match-panel review-match-panel--reveal">
        {showMeta && (
          <p className="question-meta">
            Результаты · Раунд {data.round} · Отзыв {data.questionNumber} из {data.totalInRound}
          </p>
        )}

        <div className="review-match-review-card">
          <ReviewImage src={data.image} alt={`Отзыв ${data.questionNumber}`} />
        </div>

        <div className="review-match-reveal-answer">
          <span className="question-review-label">Правильный ответ</span>
          <p className="question-review-value">
            {placeIcon(data.correctAnswer)} {data.correctAnswer}
          </p>
        </div>

        {breakdown?.optionPlayers ? (
          <div className="review-match-places review-match-places--reveal">
            {breakdown.optionPlayers.map((group) => (
              <div
                key={group.option}
                className={`review-match-place review-match-place--static${group.isCorrect ? " review-match-place--correct" : group.players.length ? " review-match-place--wrong" : ""}`}
              >
                <span className="review-match-place-icon">{placeIcon(group.option)}</span>
                <span className="review-match-place-name">{group.option}</span>
                <PlayerAvatars players={group.players} />
              </div>
            ))}
          </div>
        ) : (
          <p className="question-review-alts">Никто не ответил</p>
        )}
      </section>
    );
  }

  const canPick = !disabled;

  return (
    <section className="review-match-panel">
      {showMeta && (
        <p className="question-meta">
          Раунд {data.round} · Отзыв {data.questionNumber} из {data.totalInRound}
          {data.scoringHint ? ` · ${data.scoringHint}` : ""}
        </p>
      )}

      <p className="review-match-hint">{data.text || "Выберите место для этого отзыва"}</p>

      <div className="review-match-review-card">
        <ReviewImage src={data.image} alt={`Отзыв ${data.questionNumber}`} />
      </div>

      <div className="review-match-places">
        {(data.places || []).map((place) => (
          <button
            key={place.name}
            type="button"
            className={`review-match-place${canPick ? " review-match-place--active" : ""}`}
            disabled={!canPick}
            onClick={() => onPick?.(place.name)}
          >
            <span className="review-match-place-icon">{placeIcon(place.name)}</span>
            <span className="review-match-place-name">{place.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
