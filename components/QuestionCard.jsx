"use client";

import { useEffect, useState } from "react";

function QuestionImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="question-image-placeholder">
        <span>Изображение: {src.split("/").pop()}</span>
        <small>Добавьте файл в public{src}</small>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="question-image"
      onError={() => setFailed(true)}
    />
  );
}

function QuestionAudio({ src }) {
  const [failed, setFailed] = useState(false);
  const filename = src.split("/").pop();

  if (failed) {
    return (
      <div className="question-audio-placeholder">
        <span>Аудио: {filename}</span>
        <small>Добавьте файл в public{src}</small>
      </div>
    );
  }

  return (
    <div className="question-audio">
      <audio
        key={src}
        src={src}
        controls
        preload="metadata"
        className="question-audio-player"
        onError={() => setFailed(true)}
      />
      <span className="question-audio-label">{filename}</span>
    </div>
  );
}

function normalizeForCompare(str) {
  return String(str).toLowerCase().trim();
}

const CHOICE_TYPES = new Set(["choice", "truefalse", "pricier", "badreview"]);

function PlayerAvatar({ player, size = 32 }) {
  if (player.avatar) {
    return (
      <img
        src={player.avatar}
        alt=""
        className="player-avatar review-player-avatar"
        width={size}
        height={size}
        title={player.name}
      />
    );
  }
  return (
    <span
      className="player-avatar player-avatar-fallback review-player-avatar"
      style={{ width: size, height: size }}
      title={player.name}
    >
      {(player.name || "?")[0].toUpperCase()}
    </span>
  );
}

function AnswerAvatars({ players }) {
  if (!players?.length) return null;
  return (
    <div className="review-answer-avatars">
      {players.map((p) => (
        <PlayerAvatar key={p.id} player={p} />
      ))}
    </div>
  );
}

function ReviewAnswerGroups({ groups }) {
  if (!groups?.length) {
    return <p className="question-review-alts">Никто не ответил</p>;
  }
  return (
    <div className="review-answer-groups">
      {groups.map((g) => (
        <div
          key={g.display}
          className={`review-answer-group${g.isCorrect ? " review-answer-group--correct" : ""}`}
        >
          <span className="review-answer-group-text">{g.display}</span>
          <AnswerAvatars players={g.players} />
        </div>
      ))}
    </div>
  );
}

function ReviewClosestWinners({ breakdown }) {
  const winners = breakdown?.closestWinners || [];
  if (!winners.length) {
    return <p className="question-review-alts">Никто не дал числовой ответ</p>;
  }
  return (
    <div className="review-closest-winners">
      <span className="question-review-label">Ближе всех</span>
      {winners.map((w) => (
        <div key={w.id} className="review-closest-winner">
          <AnswerAvatars players={[w]} />
          <span className="review-closest-winner-text">
            {w.name} — <strong>{w.display}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function QuestionCard({
  question,
  onSubmit,
  disabled = false,
  showMeta = true,
}) {
  const [answer, setAnswer] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const questionKey = `${question.round}-${question.questionNumber}-${question.reviewMode ? "r" : "q"}`;

  useEffect(() => {
    setAnswer("");
    setCity("");
    setCountry("");
  }, [questionKey]);

  const isReview = Boolean(question.reviewMode);
  const isChoice =
    CHOICE_TYPES.has(question.type) && question.options?.length > 0;
  const isTrueFalse = question.type === "truefalse";
  const isBadReview = question.type === "badreview";
  const isDualInput = question.dualInput;
  const isNumeric = question.numeric;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;

    if (isDualInput) {
      if (!city.trim() && !country.trim()) return;
      onSubmit({ city: city.trim(), country: country.trim() });
      setCity("");
      setCountry("");
      return;
    }

    if (answer.trim() !== "") {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };

  const isCorrectOption = (opt) =>
    isReview &&
    normalizeForCompare(opt) === normalizeForCompare(question.correctAnswer);

  const displayTitle =
    isBadReview && !isReview ? "О чём этот отзыв?" : question.text;

  const breakdown = question.answerBreakdown;

  return (
    <div className={`question-card${isReview ? " question-card--review" : ""}`}>
      {showMeta && (
        <p className="question-meta">
          {isReview ? "Разбор · " : ""}
          Раунд {question.round} · Вопрос {question.questionNumber} из{" "}
          {question.totalInRound}
        </p>
      )}

      {isBadReview && (question.quote || question.text) && (
        <blockquote className="question-review-quote">
          {question.quote || question.text}
        </blockquote>
      )}

      {!isBadReview || isReview ? (
        <h2 className="question-title">{displayTitle}</h2>
      ) : null}

      {question.scoringHint && !isReview && (
        <p className="question-scoring-hint">{question.scoringHint}</p>
      )}

      {question.image && (
        <QuestionImage src={question.image} alt={question.text} />
      )}

      {question.audio && <QuestionAudio src={question.audio} />}

      {isReview && isChoice ? (
        <div
          className={`question-options${question.type === "truefalse" ? " question-options--truefalse" : ""}${question.type === "pricier" ? " question-options--pricier" : ""}`}
        >
          {(breakdown?.optionPlayers || question.options.map((opt) => ({ option: opt, players: [] }))).map(
            (row, idx) => {
              const opt = row.option ?? question.options[idx];
              const players = row.players || [];
              return (
                <div
                  key={idx}
                  className={`question-review-option${isCorrectOption(opt) ? " question-review-option--correct" : ""}`}
                >
                  <div className="question-review-option-main">
                    {question.optionImages?.[idx] && (
                      <QuestionImage src={question.optionImages[idx]} alt={opt} />
                    )}
                    <span>{opt}</span>
                    {isCorrectOption(opt) && (
                      <span className="question-review-check"> ✓</span>
                    )}
                  </div>
                  <AnswerAvatars players={players} />
                </div>
              );
            }
          )}
        </div>
      ) : isReview && question.type === "place" ? (
        <div className="question-review-answer question-review-answer--place">
          <div>
            <span className="question-review-label">Город</span>
            <p className="question-review-value">{question.correctCity}</p>
            <AnswerAvatars players={breakdown?.cityCorrectPlayers} />
            {breakdown?.cityGroups?.length > 0 && (
              <ReviewAnswerGroups
                groups={breakdown.cityGroups.filter((g) => !g.isCorrect)}
              />
            )}
            {question.acceptCity?.length > 0 && (
              <p className="question-review-alts">
                Также: {question.acceptCity.join(", ")}
              </p>
            )}
          </div>
          <div>
            <span className="question-review-label">Страна</span>
            <p className="question-review-value">{question.correctCountry}</p>
            <AnswerAvatars players={breakdown?.countryCorrectPlayers} />
            {breakdown?.countryGroups?.length > 0 && (
              <ReviewAnswerGroups
                groups={breakdown.countryGroups.filter((g) => !g.isCorrect)}
              />
            )}
            {question.acceptCountry?.length > 0 && (
              <p className="question-review-alts">
                Также: {question.acceptCountry.join(", ")}
              </p>
            )}
          </div>
          {question.scoringHint && (
            <p className="question-review-alts">{question.scoringHint}</p>
          )}
        </div>
      ) : isReview && question.type === "closest" ? (
        <div className="question-review-answer">
          <span className="question-review-label">Правильный ответ</span>
          <p className="question-review-value">{question.correctAnswer}</p>
          <ReviewClosestWinners breakdown={breakdown} />
          {breakdown?.allAnswers?.length > 0 && (
            <>
              <span className="question-review-label">Все ответы</span>
              <div className="review-answer-groups">
                {breakdown.allAnswers.map((a) => (
                  <div
                    key={a.id}
                    className={`review-answer-group${a.isWinner ? " review-answer-group--correct" : ""}`}
                  >
                    <span className="review-answer-group-text">{a.display}</span>
                    <AnswerAvatars players={[a]} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : isReview ? (
        <div className="question-review-answer">
          <span className="question-review-label">Правильный ответ</span>
          <p className="question-review-value">{question.correctAnswer}</p>
          {breakdown?.answerGroups ? (
            <>
              <span className="question-review-label">Ответы игроков</span>
              <ReviewAnswerGroups groups={breakdown.answerGroups} />
            </>
          ) : (
            question.acceptAlternatives?.length > 0 && (
              <p className="question-review-alts">
                Также засчитывается: {question.acceptAlternatives.join(", ")}
              </p>
            )
          )}
          {question.scoringHint && (
            <p className="question-review-alts">{question.scoringHint}</p>
          )}
        </div>
      ) : isChoice ? (
        <div
          className={`question-options${isTrueFalse ? " question-options--truefalse" : ""}${question.type === "pricier" ? " question-options--pricier" : ""}`}
        >
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className={`button question-option-btn${isCorrectOption(opt) ? " question-option-btn--correct" : ""}`}
              onClick={() => onSubmit(opt)}
              disabled={disabled}
            >
              {question.optionImages?.[idx] && (
                <QuestionImage src={question.optionImages[idx]} alt={opt} />
              )}
              <span>{opt}</span>
              {isCorrectOption(opt) && " ✓"}
            </button>
          ))}
        </div>
      ) : isDualInput ? (
        <form onSubmit={handleSubmit} className="question-dual-form">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={question.cityPlaceholder || "Город"}
            className="question-text-input"
            disabled={disabled}
            autoComplete="off"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={question.countryPlaceholder || "Страна"}
            className="question-text-input"
            disabled={disabled}
            autoComplete="off"
          />
          <button
            type="submit"
            className="button"
            disabled={disabled || (!city.trim() && !country.trim())}
          >
            Ответить
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="question-text-form">
          <input
            type={isNumeric ? "text" : "text"}
            inputMode={isNumeric ? "decimal" : "text"}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={question.placeholder || "Ваш ответ"}
            className="question-text-input"
            disabled={disabled}
            autoComplete="off"
          />
          <button type="submit" className="button" disabled={disabled || !answer.trim()}>
            Ответить
          </button>
        </form>
      )}
    </div>
  );
}
