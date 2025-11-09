// src/analyzer/emotionFusion.js
// Intelligent emotion fusion combining face + text with confidence weighting

/**
 * Fuses facial and text emotions into a single confident result
 * @param {Object|null} faceResult - { emotion: string, confidence: number } or null
 * @param {Object} textResult - { emotion: string, intent: string }
 * @returns {Object} - { emotion: string, confidence: number, source: string }
 */
export function fuseEmotions(faceResult, textResult) {
  const textEmotion = textResult.emotion;
  
  // If no face detected or low confidence, use text
  if (!faceResult) {
    return {
      emotion: textEmotion,
      confidence: 0.6, // Text analysis has moderate confidence
      source: "text"
    };
  }

  const faceEmotion = faceResult.emotion;
  const faceConfidence = faceResult.confidence;

  // Map face-api emotions to our simplified set
  const emotionMap = {
    angry: "frustrated",
    sad: "frustrated",
    disgusted: "frustrated",
    fearful: "frustrated",
    happy: "happy",
    surprised: "neutral",
    neutral: "neutral"
  };

  const mappedFaceEmotion = emotionMap[faceEmotion] || "neutral";

  // If face and text agree, high confidence
  if (mappedFaceEmotion === textEmotion) {
    return {
      emotion: mappedFaceEmotion,
      confidence: Math.min(0.95, faceConfidence + 0.2),
      source: "text+face"
    };
  }

  // If face confidence is very high, trust face
  if (faceConfidence > 0.7) {
    return {
      emotion: mappedFaceEmotion,
      confidence: faceConfidence,
      source: "face"
    };
  }

  // If text emotion is strong (not neutral) and face confidence is moderate
  if (textEmotion !== "neutral" && faceConfidence < 0.7) {
    return {
      emotion: textEmotion,
      confidence: 0.65,
      source: "text"
    };
  }

  // Default: prefer face if confidence > 0.5, otherwise text
  if (faceConfidence >= 0.5) {
    return {
      emotion: mappedFaceEmotion,
      confidence: faceConfidence,
      source: "face"
    };
  }

  return {
    emotion: textEmotion,
    confidence: 0.6,
    source: "text"
  };
}

/**
 * Logs fusion decision for debugging
 */
export function logFusion(faceResult, textResult, finalResult) {
  console.log("🔀 Emotion Fusion:");
  console.log("  Face:", faceResult ? `${faceResult.emotion} (${faceResult.confidence.toFixed(2)})` : "none");
  console.log("  Text:", textResult.emotion);
  console.log("  Final:", finalResult.emotion, `(${finalResult.confidence.toFixed(2)}, ${finalResult.source})`);
}
