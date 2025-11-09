// src/analyzer/index.js
import { analyzeText } from "./textAnalyzer.js";
import { detectFaceEmotion, loadFaceModels } from "./faceAnalyzer.js";
import { getSkill } from "./skillAnalyzer.js";
import { fuseEmotions, logFusion } from "./emotionFusion.js";
import { ENABLE_FACE } from "../config.js";

export async function analyzeUserState(text, videoEl = null) {
  const textResult = await analyzeText(text);
  let faceResult = null;

  // Try facial analysis if enabled and video available
  if (ENABLE_FACE && videoEl) {
    try {
      await loadFaceModels();
      faceResult = await detectFaceEmotion(videoEl);
    } catch (e) {
      console.warn("Facial analysis failed. Using text emotion only.", e);
    }
  }

  // Intelligent emotion fusion
  const emotionResult = fuseEmotions(faceResult, textResult);
  logFusion(faceResult, textResult, emotionResult);

  const skill = getSkill();
  const intent = textResult.intent;

  return {
    intent,
    metadata: {
      emotion: emotionResult.emotion,
      emotionConfidence: emotionResult.confidence,
      emotionSource: emotionResult.source,
      skill
    }
  };
}
