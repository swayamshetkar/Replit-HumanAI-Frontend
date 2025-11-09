// src/analyzer/faceAnalyzer.js
async function ensureFaceApiLoaded() {
  if (window.faceapi) return;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="face-api.min.js"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('face-api script failed to load')),{ once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('face-api script failed to load'));
    document.head.appendChild(s);
  });
}

export async function loadFaceModels() {
  await ensureFaceApiLoaded();
  if (!window.faceapi) {
    throw new Error("faceapi not available. CSP may block tfjs (unsafe-eval). Set ENABLE_FACE=false or adjust CSP.");
  }

  // Use local models stored in public/models
  const MODEL_URL = "/public/models";
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    console.log("✅ Face-api models loaded from local storage");
  } catch (e) {
    console.warn("Face-api model load failed; facial emotion will be disabled.", e);
    throw e;
  }
}

export async function detectFaceEmotion(videoEl) {
  try {
    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,      // Higher resolution for better accuracy
        scoreThreshold: 0.4  // More sensitive detection
      }))
      .withFaceExpressions();

    if (!detection) {
      console.log("🧠 No face detected");
      return null; // Return null instead of neutral to distinguish from low confidence
    }

    const expr = detection.expressions;
    const sorted = Object.entries(expr).sort((a, b) => b[1] - a[1]);
    const [topEmotion, confidence] = sorted[0];

    console.log("🧠 Face emotion:", topEmotion, "confidence:", confidence.toFixed(2));
    console.log("📊 All scores:", Object.entries(expr).map(([e, v]) => `${e}: ${v.toFixed(2)}`).join(", "));

    // Only trust detection if confidence > 0.5
    if (confidence < 0.5) {
      console.log("⚠️ Low confidence, returning null");
      return null;
    }

    return { emotion: topEmotion, confidence };
  } catch (e) {
    console.warn("Face detection failed:", e);
    return null;
  }
}
