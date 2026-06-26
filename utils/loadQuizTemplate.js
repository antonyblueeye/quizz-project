const fs = require("fs");
const path = require("path");

const QUIZ_FILES = {
  quiz1: "quiz.json",
};

function loadQuizTemplate(quizTemplateId) {
  const filename = QUIZ_FILES[quizTemplateId] || "quiz.json";
  const filePath = path.join(process.cwd(), "app", "data", filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

module.exports = { loadQuizTemplate, QUIZ_FILES };
