// src/analyzer/skillAnalyzer.js
let total = 0, success = 0;

export function updateSkill(successEvent) {
  total++;
  if (successEvent) success++;
}

export function getSkill() {
  const rate = success / Math.max(1, total);
  if (rate > 0.8) return "fast_learner";
  if (rate < 0.4) return "slow_learner";
  return "moderate_learner";
}
