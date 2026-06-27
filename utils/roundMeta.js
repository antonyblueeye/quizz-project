const ROUND_DEFAULTS = {
  choice: {
    description:
      "10 вопросов с четырьмя вариантами ответа. Нужно выбрать один правильный.",
    scoring: "1 балл за каждый правильный ответ.",
  },
  movie: {
    description:
      "10 кадров из фильмов. Введите название фильма — учитываются опечатки и близкие написания.",
    scoring: "1 балл за каждый угаданный фильм.",
  },
  song: {
    description:
      "10 аудиофрагментов (~45 сек с 20-й секунды трека). Угадайте название песни и исполнителя.",
    scoring: "1 балл за песню, 1 балл за группу (или исполнителя).",
  },
  truefalse: {
    description:
      "10 утверждений. Нужно решить — правда это или ложь.",
    scoring: "1 балл за каждый правильный ответ.",
  },
  logic: {
    description:
      "10 логических и знаниевых вопросов. Ответ — свободный текст.",
    scoring: "1 балл за правильный ответ (с учётом опечаток).",
  },
  brand: {
    description:
      "10 логотипов известных брендов. Напишите название компании или марки.",
    scoring: "1 балл за каждый угаданный бренд.",
  },
  celebrity: {
    description:
      "10 AI-портретов знаменитостей в женской версии. Напишите, кто изображён на фото.",
    scoring: "1 балл за каждый правильный ответ (с учётом опечаток).",
  },
  place: {
    description:
      "10 фотографий городов. Укажите город и страну — можно заполнить одно или оба поля.",
    scoring: "3 балла за город, 1 балл за страну.",
  },
  closest: {
    description:
      "10 числовых вопросов. Нужно назвать число — побеждает тот, кто ближе всех к правильному.",
    scoring: "3 балла тому, кто ответил ближе всех (при ничьей — всем ближайшим).",
  },
  pricier: {
    description:
      "10 пар предметов или услуг. Выберите, что дороже.",
    scoring: "1 балл за каждый правильный выбор.",
  },
  badreview: {
    description:
      "10 отзывов в духе Google Maps. Угадайте, о чём отзыв — ресторан, отель и т.д.",
    scoring: "1 балл за каждый правильный ответ.",
  },
  reviewmatch: {
    description:
      "10 скринов отзывов. Все игроки одновременно выбирают место из списка.",
    scoring: "0,5 балла за каждое верное сопоставление.",
  },
  cover: {
    description: "10 обложек альбомов. Назовите группу или исполнителя.",
    scoring: "1 балл за каждый правильный ответ.",
  },
};

function buildRoundIntro(round, roundNumber, totalRounds) {
  const defs = ROUND_DEFAULTS[round.type] || {
    description: "Отвечайте на вопросы раунда.",
    scoring: "1 балл за правильный ответ.",
  };

  return {
    round: round.id,
    roundNumber,
    totalRounds,
    roundTitle: round.title,
    type: round.type,
    totalQuestions: round.questions?.length || 0,
    description: round.description || defs.description,
    scoring: round.scoring || defs.scoring,
  };
}

module.exports = { buildRoundIntro, ROUND_DEFAULTS };
