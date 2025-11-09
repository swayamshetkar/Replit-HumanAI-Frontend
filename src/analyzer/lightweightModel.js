// src/analyzer/lightweightModel.js
// A tiny heuristic model for emotion + intent when transformer fails or is disabled.
// No network calls; purely rule-based.

const emotionKeywords = {
  frustrated: [
    "error", "fail", "failed", "failing", "bug", "issue", "problem",
    "slow", "confused", "can't", "cannot", "broken", "stuck", "annoying",
    "annoyed", "angry", "frustrat", "hate", "stupid", "bad", "wrong",
    "won't work", "not working", "doesn't work", "keep getting", "why",
    "ugh", "argh", "damn", "help", "fix", "crash"
  ],
  happy: [
    "success", "successful", "worked", "works", "yay", "great", "awesome",
    "cool", "nice", "love", "win", "perfect", "excellent", "amazing",
    "thank", "thanks", "good", "better", "solved", "fixed", "yes"
  ],
};

const intentKeywords = {
  refactor: ["refactor", "optimize", "improve", "cleanup", "clean up", "simplify"],
  code: ["def ", "function ", "class ", "=>", "{", "for (", "while (", "if (", "return"],
};

function score(text, list) {
  const t = text.toLowerCase();
  return list.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
}

export function analyzeLocalText(text) {
  const t = text.toLowerCase();

  // Emotion scoring
  const frustratedScore = score(t, emotionKeywords.frustrated);
  const happyScore = score(t, emotionKeywords.happy);
  let emotion = "neutral";
  if (frustratedScore > happyScore && frustratedScore > 0) emotion = "frustrated";
  else if (happyScore > frustratedScore && happyScore > 0) emotion = "happy";

  // Intent
  let intent = "study";
  if (score(t, intentKeywords.refactor) > 0) intent = "refactor";
  else if (score(t, intentKeywords.code) > 0) intent = "code";

  return { intent, emotion };
}
