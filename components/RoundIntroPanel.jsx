export default function RoundIntroPanel({
  intro,
  showStartButton = false,
  onStart,
  variant = "default",
}) {
  if (!intro) return null;

  return (
    <section className={`round-intro-panel round-intro-panel--${variant}`}>
      <div className="round-intro-hero">
        <span className="round-intro-hero-label">Раунд</span>
        <span className="round-intro-hero-number">{intro.roundNumber}</span>
        <span className="round-intro-hero-total">из {intro.totalRounds}</span>
      </div>

      <h2 className="round-intro-title">{intro.roundTitle}</h2>
      <p className="round-intro-meta">{intro.totalQuestions} вопросов</p>

      <div className="round-intro-body">
        <p className="round-intro-description">{intro.description}</p>
        <div className="round-intro-scoring">
          <span className="round-intro-scoring-label">Баллы</span>
          <p>{intro.scoring}</p>
        </div>
      </div>

      {showStartButton && (
        <button type="button" className="button round-intro-start-btn" onClick={onStart}>
          Начать раунд
        </button>
      )}
    </section>
  );
}
