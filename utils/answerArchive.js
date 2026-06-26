const {
  isAnswerCorrect,
  isChoiceType,
  parseNumericAnswer,
  scorePlaceAnswer,
  scoreSongAnswer,
  normalize,
} = require("./answerMatch");

function playerChip(id, player) {
  return {
    id,
    name: player.name,
    avatar: player.avatar || null,
  };
}

function collectPlayerAnswers(sess) {
  return Object.entries(sess.players)
    .filter(([, p]) => {
      if (p.answer === null || p.answer === "") return false;
      if (typeof p.answer === "object") {
        if ("city" in p.answer || "country" in p.answer) {
          return Boolean(
            String(p.answer.city || "").trim() || String(p.answer.country || "").trim()
          );
        }
        if ("title" in p.answer || "artist" in p.answer) {
          return Boolean(
            String(p.answer.title || "").trim() || String(p.answer.artist || "").trim()
          );
        }
      }
      return true;
    })
    .map(([id, p]) => ({
      ...playerChip(id, p),
      answer: p.answer,
    }));
}

function formatDisplayAnswer(answer, type) {
  if (type === "place" && typeof answer === "object" && answer) {
    const parts = [];
    if (answer.city?.trim()) parts.push(answer.city.trim());
    if (answer.country?.trim()) parts.push(answer.country.trim());
    return parts.join(", ") || "—";
  }
  if (type === "song" && typeof answer === "object" && answer) {
    const parts = [];
    if (answer.title?.trim()) parts.push(answer.title.trim());
    if (answer.artist?.trim()) parts.push(answer.artist.trim());
    return parts.join(" — ") || "—";
  }
  return String(answer ?? "").trim() || "—";
}

function getChoiceOptions(round, question) {
  if (round.type === "truefalse") return ["Правда", "Ложь"];
  return question.options || [];
}

function groupTextAnswers(players, question, type) {
  const map = new Map();
  for (const p of players) {
    const display = formatDisplayAnswer(p.answer, type);
    const key = normalize(display);
    if (!map.has(key)) {
      map.set(key, {
        display,
        isCorrect: isAnswerCorrect(p.answer, question, type),
        players: [],
      });
    }
    map.get(key).players.push(playerChip(p.id, p));
  }
  return [...map.values()].sort((a, b) => {
    if (a.isCorrect !== b.isCorrect) return a.isCorrect ? -1 : 1;
    return b.players.length - a.players.length;
  });
}

function buildClosestBreakdown(players, question) {
  const correct = Number(question.answer);
  const withNum = players
    .map((p) => {
      const numeric = parseNumericAnswer(p.answer);
      return {
        ...p,
        numeric,
        diff: Number.isNaN(numeric) ? Infinity : Math.abs(numeric - correct),
        display: Number.isNaN(numeric) ? formatDisplayAnswer(p.answer, "closest") : String(numeric),
      };
    })
    .filter((p) => !Number.isNaN(p.numeric));

  let bestDiff = Infinity;
  withNum.forEach((p) => {
    if (p.diff < bestDiff) bestDiff = p.diff;
  });

  const winners =
    Number.isFinite(bestDiff) && bestDiff !== Infinity
      ? withNum
          .filter((p) => p.diff === bestDiff)
          .map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            value: p.numeric,
            display: p.display,
          }))
      : [];

  const allAnswers = withNum.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    display: p.display,
    value: p.numeric,
    isWinner: winners.some((w) => w.id === p.id),
  }));

  return { closestWinners: winners, allAnswers };
}

function buildPlaceBreakdown(players, question) {
  const cityGroups = new Map();
  const countryGroups = new Map();
  const cityCorrectPlayers = [];
  const countryCorrectPlayers = [];

  for (const p of players) {
    const city = String(p.answer?.city || "").trim();
    const country = String(p.answer?.country || "").trim();
    const result = scorePlaceAnswer(p.answer, question);
    const chip = playerChip(p.id, p);

    if (result.city) cityCorrectPlayers.push(chip);
    if (result.country) countryCorrectPlayers.push(chip);

    if (city) {
      const key = normalize(city);
      if (!cityGroups.has(key)) {
        cityGroups.set(key, {
          display: city,
          isCorrect: result.city,
          players: [],
        });
      }
      cityGroups.get(key).players.push(chip);
    }

    if (country) {
      const key = normalize(country);
      if (!countryGroups.has(key)) {
        countryGroups.set(key, {
          display: country,
          isCorrect: result.country,
          players: [],
        });
      }
      countryGroups.get(key).players.push(chip);
    }
  }

  return {
    cityCorrectPlayers,
    countryCorrectPlayers,
    cityGroups: [...cityGroups.values()],
    countryGroups: [...countryGroups.values()],
  };
}

function buildSongBreakdown(players, question) {
  const titleGroups = new Map();
  const artistGroups = new Map();
  const titleCorrectPlayers = [];
  const artistCorrectPlayers = [];

  for (const p of players) {
    const title = String(p.answer?.title || "").trim();
    const artist = String(p.answer?.artist || "").trim();
    const result = scoreSongAnswer(p.answer, question);
    const chip = playerChip(p.id, p);

    if (result.title) titleCorrectPlayers.push(chip);
    if (result.artist) artistCorrectPlayers.push(chip);

    if (title) {
      const key = normalize(title);
      if (!titleGroups.has(key)) {
        titleGroups.set(key, {
          display: title,
          isCorrect: result.title,
          players: [],
        });
      }
      titleGroups.get(key).players.push(chip);
    }

    if (artist) {
      const key = normalize(artist);
      if (!artistGroups.has(key)) {
        artistGroups.set(key, {
          display: artist,
          isCorrect: result.artist,
          players: [],
        });
      }
      artistGroups.get(key).players.push(chip);
    }
  }

  return {
    titleCorrectPlayers,
    artistCorrectPlayers,
    titleGroups: [...titleGroups.values()],
    artistGroups: [...artistGroups.values()],
  };
}

function buildChoiceBreakdown(round, question, players) {
  const options = getChoiceOptions(round, question);
  return options.map((opt) => ({
    option: opt,
    isCorrect: normalize(opt) === normalize(question.answer),
    players: players
      .filter((p) => normalize(String(p.answer)) === normalize(opt))
      .map((p) => playerChip(p.id, p)),
  }));
}

function buildAnswerBreakdown(sess, round, question) {
  const players = collectPlayerAnswers(sess);
  const type = round.type;

  if (type === "closest") {
    return { type, ...buildClosestBreakdown(players, question) };
  }

  if (type === "place") {
    return { type, ...buildPlaceBreakdown(players, question) };
  }

  if (type === "song") {
    return { type, ...buildSongBreakdown(players, question) };
  }

  if (isChoiceType(type)) {
    return {
      type,
      optionPlayers: buildChoiceBreakdown(round, question, players),
    };
  }

  return {
    type,
    answerGroups: groupTextAnswers(players, question, type),
  };
}

module.exports = { buildAnswerBreakdown };
