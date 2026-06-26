const {
  getSongTitlePoints,
  getSongArtistPoints,
} = require("./scoring");

function imagePath(round, filename) {
  return `/quiz/${round.imageFolder}/${filename}`;
}

function formatQuestion(round, question, questionIndex) {
  const base = {
    round: round.id,
    roundTitle: round.title,
    type: round.type,
    questionNumber: questionIndex + 1,
    totalInRound: round.questions.length,
  };

  if (round.type === "choice") {
    return { ...base, text: question.text, options: question.options };
  }

  if (round.type === "truefalse") {
    return {
      ...base,
      text: question.text,
      options: ["Правда", "Ложь"],
    };
  }

  if (round.type === "logic") {
    return {
      ...base,
      text: question.text,
      placeholder: question.placeholder || "Ваш ответ",
    };
  }

  if (round.type === "movie") {
    return {
      ...base,
      text: "Угадай фильм по кадру",
      image: imagePath(round, question.image),
      placeholder: "Название фильма",
    };
  }

  if (round.type === "celebrity") {
    return {
      ...base,
      text: question.prompt || "Угадай знаменитость в женской версии",
      image: imagePath(round, question.image),
      placeholder: question.placeholder || "Имя знаменитости",
    };
  }

  if (round.type === "cover") {
    return {
      ...base,
      text: "Назовите группу, которая выпустила этот альбом",
      image: imagePath(round, question.image),
      placeholder: "Название группы",
    };
  }

  if (round.type === "song") {
    const folder = round.audioFolder || round.mediaFolder || "round3";
    const clipSeconds = question.audioClipSeconds ?? round.audioClipSeconds;
    const clipStart = question.audioClipStart ?? round.audioClipStart ?? 0;
    const payload = {
      ...base,
      text: "Угадайте песню и исполнителя по фрагменту",
      audio: `/quiz/${folder}/${question.audio}`,
      dualInput: true,
      dualFields: [
        { key: "title", placeholder: "Название песни" },
        { key: "artist", placeholder: "Название группы" },
      ],
      scoringHint: `Песня — ${getSongTitlePoints(round, question)} б. · Группа — ${getSongArtistPoints(round, question)} б.`,
    };
    if (clipSeconds) {
      payload.audioClip = {
        start: clipStart,
        duration: clipSeconds,
        random: question.audioClipRandom ?? round.audioClipRandom ?? false,
      };
      payload.audioClipHint =
        payload.audioClip.random
          ? `Случайный фрагмент · ${clipSeconds} сек`
          : `С ${clipStart} сек · ${clipSeconds} сек`;
    }
    return payload;
  }

  if (round.type === "brand") {
    return {
      ...base,
      text: "Угадайте бренд по логотипу",
      image: imagePath(round, question.image),
      placeholder: question.placeholder || "Название бренда",
    };
  }

  if (round.type === "place") {
    return {
      ...base,
      text: "Угадайте место по фото",
      image: imagePath(round, question.image),
      dualInput: true,
      dualFields: [
        { key: "city", placeholder: "Город" },
        { key: "country", placeholder: "Страна" },
      ],
      scoringHint: `Город — ${question.cityPoints ?? 3} б. · Страна — ${question.countryPoints ?? 1} б.`,
    };
  }

  if (round.type === "closest") {
    return {
      ...base,
      text: question.text,
      numeric: true,
      placeholder: question.placeholder || "Число",
      scoringHint: `${question.points ?? 3} балла — кто ближе всех`,
    };
  }

  if (round.type === "pricier") {
    const imgs = (question.images || []).map((img) => imagePath(round, img));
    return {
      ...base,
      text: question.text || "Что дороже?",
      options: question.options,
      optionImages: imgs.length ? imgs : undefined,
    };
  }

  if (round.type === "badreview") {
    return {
      ...base,
      text: question.text || "О чём этот отзыв?",
      quote: question.quote || question.text,
      options: question.options,
    };
  }

  if (round.type === "reviewmatch") {
    return formatReviewMatchPreview(round, question, questionIndex);
  }

  return base;
}

function formatReviewMatchPreview(round, question, questionIndex) {
  const places = (round.places || []).map((name) => ({
    name,
    used: false,
    pickedBy: null,
    correct: null,
    wasCorrectAnswer: false,
  }));

  return {
    type: "reviewmatch",
    round: round.id,
    roundTitle: round.title,
    questionNumber: questionIndex + 1,
    totalInRound: round.questions.length,
    reviewNumber: questionIndex + 1,
    totalReviews: round.questions.length,
    text: "Сопоставьте отзыв с местом",
    image: question.image ? imagePath(round, question.image) : null,
    places,
    availablePlaces: round.places || [],
    activePlayer: null,
    isYourTurn: false,
    matchHistory: [],
    previewMode: true,
    scoringHint: `${round.matchPoints ?? 1} б. за верное сопоставление`,
  };
}

function formatReviewQuestion(round, question, questionIndex, answerBreakdown) {
  const formatted = formatQuestion(round, question, questionIndex);
  const review = {
    ...formatted,
    reviewMode: true,
    acceptAlternatives: question.accept || [],
  };

  if (round.type === "place") {
    review.correctCity = question.city;
    review.correctCountry = question.country;
    review.correctAnswer = `${question.city}, ${question.country}`;
    review.scoringHint = `Город — ${question.cityPoints ?? 3} б. · Страна — ${question.countryPoints ?? 1} б.`;
    if (question.acceptCity?.length) review.acceptCity = question.acceptCity;
    if (question.acceptCountry?.length) review.acceptCountry = question.acceptCountry;
  } else if (round.type === "song") {
    review.correctTitle = question.title || question.answer;
    review.correctArtist = question.artist;
    review.correctAnswer = `${review.correctTitle} — ${review.correctArtist}`;
    review.scoringHint = `Песня — ${question.titlePoints ?? 1} б. · Группа — ${question.artistPoints ?? 1} б.`;
    if (question.acceptTitle?.length) review.acceptTitle = question.acceptTitle;
    if (question.acceptArtist?.length) review.acceptArtist = question.acceptArtist;
  } else if (round.type === "closest") {
    review.correctAnswer = String(question.answer);
    if (question.unit) review.correctAnswer += ` ${question.unit}`;
    review.scoringHint = `${question.points ?? 3} балла — ближайший ответ`;
  } else if (round.type === "badreview") {
    review.correctAnswer = question.answer;
    review.quote = question.quote || question.text;
  } else if (round.type === "reviewmatch") {
    review.correctAnswer = question.answer;
    review.text = "Правильное место для этого отзыва";
    if (question.image) review.image = imagePath(round, question.image);
    review.places = round.places || [];
  } else {
    review.correctAnswer = question.answer;
  }

  if (answerBreakdown) {
    review.answerBreakdown = answerBreakdown;
  }

  return review;
}

function truncate(str, max) {
  const t = String(str).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function getQuestionLabel(round, question, questionIndex) {
  if (question.text) return truncate(question.text, 56);
  if (question.quote) return truncate(question.quote, 56);
  if (question.image) return `📷 ${question.image}`;
  if (question.audio) return `🎵 ${question.audio}`;
  if (question.options?.length) return truncate(question.options.join(" / "), 56);
  return `Вопрос ${questionIndex + 1}`;
}

const ROUND_TYPE_LABELS = {
  choice: "Выбор",
  truefalse: "П/Л",
  logic: "Текст",
  movie: "Фильм",
  song: "Песня",
  brand: "Бренд",
  celebrity: "Знаменитость",
  place: "Место",
  closest: "Цифра",
  pricier: "Цена",
  badreview: "Отзыв",
  reviewmatch: "Сопоставление",
  cover: "Обложка",
};

module.exports = {
  formatQuestion,
  formatReviewQuestion,
  formatReviewMatchPreview,
  getQuestionLabel,
  ROUND_TYPE_LABELS,
};
