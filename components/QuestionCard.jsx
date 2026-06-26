"use client";

import { useEffect, useRef, useState } from "react";

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

function QuestionAudio({ src, clip, hint }) {
  const audioRef = useRef(null);
  const clipRef = useRef({ start: 0, duration: 20 });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const filename = src.split("/").pop();
  const hasClip = Boolean(clip?.duration);

  useEffect(() => {
    clipRef.current = {
      start: clip?.start ?? 0,
      duration: clip?.duration ?? 20,
    };
    setReady(false);
    setPlaying(false);
  }, [src, clip?.start, clip?.duration]);

  const clampStart = (fileDuration) => {
    const { start, duration } = clipRef.current;
    const maxStart = Math.max(0, fileDuration - duration);
    return Math.min(Math.max(0, start), maxStart);
  };

  const seekToClipStart = () => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const start = hasClip ? clampStart(el.duration) : 0;
    clipRef.current.start = start;
    el.currentTime = start;
  };

  const handleLoadedMetadata = () => {
    seekToClipStart();
    setReady(true);
  };

  const handlePlay = () => {
    seekToClipStart();
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleTimeUpdate = () => {
    stopIfPastClipEnd();
  };

  const stopIfPastClipEnd = () => {
    if (!hasClip) return;
    const el = audioRef.current;
    if (!el) return;
    const { start, duration } = clipRef.current;
    const end = start + duration;
    if (el.currentTime < start - 0.05) {
      el.currentTime = start;
    }
    if (el.currentTime >= end - 0.05) {
      el.pause();
      el.currentTime = start;
      setPlaying(false);
    }
  };

  useEffect(() => {
    if (!hasClip || !playing) return undefined;
    const timer = setInterval(stopIfPastClipEnd, 200);
    return () => clearInterval(timer);
  }, [hasClip, playing, src, clip?.start, clip?.duration]);

  const handleListen = async () => {
    const el = audioRef.current;
    if (!el) return;
    seekToClipStart();
    try {
      await el.play();
    } catch {
      /* autoplay policy or missing file */
    }
  };

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
        ref={audioRef}
        key={src}
        src={src}
        preload="metadata"
        className={hasClip ? "question-audio-element" : "question-audio-player"}
        controls={!hasClip}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onError={() => setFailed(true)}
      />
      {hasClip ? (
        <div className="question-audio-clip-controls">
          <button
            type="button"
            className="button question-audio-play-btn"
            onClick={handleListen}
            disabled={!ready}
          >
            {playing ? "▶ Играет…" : "▶ Слушать фрагмент"}
          </button>
          <span className="question-audio-label">
            {hint || `Фрагмент · ${clip.duration} сек`}
          </span>
        </div>
      ) : (
        <span className="question-audio-label">{filename}</span>
      )}
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

function ReviewDualFieldBlock({
  label,
  correctValue,
  acceptAlternatives,
  correctPlayers,
  groups,
  scoringHint,
}) {
  return (
    <div>
      <span className="question-review-label">{label}</span>
      <p className="question-review-value">{correctValue}</p>
      <AnswerAvatars players={correctPlayers} />
      {groups?.length > 0 && (
        <ReviewAnswerGroups groups={groups.filter((g) => !g.isCorrect)} />
      )}
      {acceptAlternatives?.length > 0 && (
        <p className="question-review-alts">Также: {acceptAlternatives.join(", ")}</p>
      )}
      {scoringHint && <p className="question-review-alts">{scoringHint}</p>}
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
  const [dualValues, setDualValues] = useState({});

  const questionKey = `${question.round}-${question.questionNumber}-${question.reviewMode ? "r" : "q"}`;

  useEffect(() => {
    setAnswer("");
    setDualValues({});
  }, [questionKey]);

  const isReview = Boolean(question.reviewMode);
  const isChoice =
    CHOICE_TYPES.has(question.type) && question.options?.length > 0;
  const isTrueFalse = question.type === "truefalse";
  const isBadReview = question.type === "badreview";
  const dualFields = question.dualFields;
  const isDualInput = Boolean(dualFields?.length);
  const isNumeric = question.numeric;

  const handleDualFieldChange = (key, value) => {
    setDualValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;

    if (isDualInput) {
      const payload = {};
      let hasAny = false;
      for (const field of dualFields) {
        const value = String(dualValues[field.key] || "").trim();
        payload[field.key] = value;
        if (value) hasAny = true;
      }
      if (!hasAny) return;
      onSubmit(payload);
      setDualValues({});
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

      {question.audio && (
        <QuestionAudio
          src={question.audio}
          clip={question.audioClip}
          hint={question.audioClipHint}
        />
      )}

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
          <ReviewDualFieldBlock
            label="Город"
            correctValue={question.correctCity}
            acceptAlternatives={question.acceptCity}
            correctPlayers={breakdown?.cityCorrectPlayers}
            groups={breakdown?.cityGroups}
          />
          <ReviewDualFieldBlock
            label="Страна"
            correctValue={question.correctCountry}
            acceptAlternatives={question.acceptCountry}
            correctPlayers={breakdown?.countryCorrectPlayers}
            groups={breakdown?.countryGroups}
          />
          {question.scoringHint && (
            <p className="question-review-alts">{question.scoringHint}</p>
          )}
        </div>
      ) : isReview && question.type === "song" ? (
        <div className="question-review-answer question-review-answer--place">
          <ReviewDualFieldBlock
            label="Песня"
            correctValue={question.correctTitle}
            acceptAlternatives={question.acceptTitle}
            correctPlayers={breakdown?.titleCorrectPlayers}
            groups={breakdown?.titleGroups}
          />
          <ReviewDualFieldBlock
            label="Группа"
            correctValue={question.correctArtist}
            acceptAlternatives={question.acceptArtist}
            correctPlayers={breakdown?.artistCorrectPlayers}
            groups={breakdown?.artistGroups}
          />
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
          {dualFields.map((field) => (
            <input
              key={field.key}
              type="text"
              value={dualValues[field.key] || ""}
              onChange={(e) => handleDualFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="question-text-input"
              disabled={disabled}
              autoComplete="off"
            />
          ))}
          <button
            type="submit"
            className="button"
            disabled={
              disabled ||
              !dualFields.some((field) => String(dualValues[field.key] || "").trim())
            }
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
