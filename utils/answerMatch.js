// Text answer matching: fuzzy typos, regex patterns, Latin/Cyrillic homoglyphs

const LATIN_TO_CYR = {
  a: "а",
  c: "с",
  e: "е",
  i: "и",
  k: "к",
  m: "м",
  n: "н",
  o: "о",
  p: "р",
  r: "г",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "у",
};

function unifyAlphabet(str) {
  return str
    .split("")
    .map((ch) => LATIN_TO_CYR[ch] || ch)
    .join("");
}

function normalize(str) {
  if (typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarityStrings(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function defaultThreshold(len) {
  if (len <= 4) return 0.7;
  if (len <= 9) return 0.76;
  if (len <= 14) return 0.84;
  return 0.88;
}

function getMatchConfig(question) {
  const cfg = question.match || {};
  return {
    fuzzy: cfg.fuzzy !== false,
    threshold: typeof cfg.threshold === "number" ? cfg.threshold : null,
    patterns: [...(question.patterns || []), ...(cfg.patterns || [])],
  };
}

function matchesPattern(playerAnswer, pattern) {
  try {
    const playerForms = [
      ...new Set([normalize(playerAnswer), unifyAlphabet(normalize(playerAnswer))]),
    ];
    const normalizedPattern = pattern.replace(/ё/g, "[её]");
    const re = new RegExp(normalizedPattern, "iu");
    return playerForms.some((p) => p && re.test(p));
  } catch {
    return false;
  }
}

function matchesCandidate(playerAnswer, candidate, threshold) {
  const player = normalize(playerAnswer);
  const correct = normalize(candidate);
  if (!player || !correct) return false;

  const allPlayer = [...new Set([player, unifyAlphabet(player)])];
  const allCorrect = [...new Set([correct, unifyAlphabet(correct)])];

  for (const p of allPlayer) {
    for (const c of allCorrect) {
      if (!p || !c) continue;
      if (p === c) return true;
      if (p.includes(c) || c.includes(p)) return true;

      const thr = threshold ?? defaultThreshold(Math.max(p.length, c.length));
      if (similarityStrings(p, c) >= thr) return true;
    }
  }
  return false;
}

function isChoiceType(type) {
  return ["choice", "truefalse", "pricier", "badreview"].includes(type);
}

function parseNumericAnswer(val) {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (val == null || val === "") return NaN;
  const s = String(val).replace(/\s/g, "").replace(",", ".");
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

function parsePlaceAnswer(val) {
  if (val == null) return { city: "", country: "" };
  if (typeof val === "object") {
    return {
      city: String(val.city || "").trim(),
      country: String(val.country || "").trim(),
    };
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") {
        return parsePlaceAnswer(parsed);
      }
    } catch {
      /* plain string — ignore */
    }
  }
  return { city: "", country: "" };
}

function parseSongAnswer(val) {
  if (val == null) return { title: "", artist: "" };
  if (typeof val === "object") {
    return {
      title: String(val.title || "").trim(),
      artist: String(val.artist || "").trim(),
    };
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") {
        return parseSongAnswer(parsed);
      }
    } catch {
      /* plain string — ignore */
    }
  }
  return { title: "", artist: "" };
}

function matchesPlaceField(playerValue, correct, acceptList, question) {
  if (!playerValue?.trim()) return false;
  const fakeQuestion = {
    answer: correct,
    accept: acceptList || [],
    match: question.match,
    patterns: question.patterns,
  };
  return isAnswerCorrect(playerValue, fakeQuestion, "logic");
}

function scorePlaceAnswer(playerAnswer, question) {
  const { city, country } = parsePlaceAnswer(playerAnswer);
  return {
    city: matchesPlaceField(city, question.city, question.acceptCity, question),
    country: matchesPlaceField(
      country,
      question.country,
      question.acceptCountry,
      question
    ),
  };
}

function matchesSongField(playerValue, correct, acceptList, question) {
  if (!playerValue?.trim()) return false;
  const fakeQuestion = {
    answer: correct,
    accept: acceptList || [],
    match: question.match,
    patterns: question.patterns,
  };
  return isAnswerCorrect(playerValue, fakeQuestion, "logic");
}

function scoreSongAnswer(playerAnswer, question) {
  const { title, artist } = parseSongAnswer(playerAnswer);
  const correctTitle = question.title || question.answer;
  const correctArtist = question.artist;
  return {
    title: matchesSongField(title, correctTitle, question.acceptTitle, question),
    artist: matchesSongField(artist, correctArtist, question.acceptArtist, question),
  };
}

function isAnswerCorrect(playerAnswer, question, type) {
  if (playerAnswer == null || playerAnswer === "") return false;

  if (type === "reviewmatch") {
    return normalize(String(playerAnswer)) === normalize(question.answer);
  }

  if (isChoiceType(type)) {
    return normalize(playerAnswer) === normalize(question.answer);
  }

  if (type === "place" || type === "closest" || type === "song") {
    return false;
  }

  const config = getMatchConfig(question);

  for (const pattern of config.patterns) {
    if (matchesPattern(playerAnswer, pattern)) return true;
  }

  const candidates = [question.answer, ...(question.accept || [])];
  const unique = [...new Set(candidates.filter(Boolean))];

  if (config.fuzzy) {
    return unique.some((c) =>
      matchesCandidate(playerAnswer, c, config.threshold)
    );
  }

  return unique.some((c) => normalize(playerAnswer) === normalize(c));
}

module.exports = {
  normalize,
  isAnswerCorrect,
  isChoiceType,
  parseNumericAnswer,
  parsePlaceAnswer,
  parseSongAnswer,
  scorePlaceAnswer,
  scoreSongAnswer,
  matchesCandidate,
  matchesPattern,
  getMatchConfig,
};
