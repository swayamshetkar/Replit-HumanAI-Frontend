// src/analyzer/textAnalyzer.js
import { ENABLE_TRANSFORMER, TRANSFORMER_TIMEOUT_MS } from "../config.js";
let transformerPipeline = null;
let transformerFailedPermanently = false;

async function loadTransformerPipelineSafe() {
  if (!ENABLE_TRANSFORMER) {
    transformerFailedPermanently = true;
    return null;
  }
  if (transformerFailedPermanently) return null;
  if (transformerPipeline) return transformerPipeline;
  try {
    const module = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.9.0");
    // Ensure remote models are allowed and avoid assuming local /models path
    if (module.env) {
      module.env.allowRemoteModels = true;
      // Unset any local model path so it won't try /models/... on your server
      module.env.localModelPath = undefined;
      module.env.useBrowserCache = true;
    }
    transformerPipeline = await module.pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
    return transformerPipeline;
  } catch (err) {
    console.warn("Transformers pipeline load failed. Falling back to lightweight model.", err);
    transformerFailedPermanently = true; // avoid repeated noisy attempts
    return null;
  }
}

// Lightweight heuristic model as a fallback (no external downloads)
import { analyzeLocalText } from "./lightweightModel.js";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function analyzeText(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { intent: "study", emotion: "neutral" };

  // Try remote transformer first, but timebox to keep UI responsive
  const pipe = await loadTransformerPipelineSafe();
  if (pipe) {
    try {
      const result = await withTimeout(pipe(trimmed), TRANSFORMER_TIMEOUT_MS);
      const label = (result?.[0]?.label || "").toLowerCase();
      let emotion = "neutral";
      if (label.includes("negative")) emotion = "frustrated";
      else if (label.includes("positive")) emotion = "happy";

      // Keep simple intent heuristic even with transformer
      let intent = "study";
      const t = trimmed.toLowerCase();
      if (t.includes("refactor") || t.includes("optimize")) intent = "refactor";
      else if (t.includes("def ") || t.includes("function ") || t.includes("class ") || t.includes("{")) intent = "code";

      return { intent, emotion };
    } catch (err) {
      console.warn("Transformer inference failed or timed out. Using lightweight model.", err);
    }
  }

  // Fallback path
  return analyzeLocalText(trimmed);
}
