// src/bridge.js
// A thin integration layer exposing the existing analysis + backend flow
// so any external/new frontend can call it without rewriting core logic.

import { analyzeUserState } from "./analyzer/index.js";
import { sendToBackend, trainModel as _trainModel } from "./api/backend.js";
import { ENABLE_FACE } from "./config.js";

const ROUTES = {
  study: "/ask_stream",
  code: "/code_assist",
  refactor: "/refactor",
};

async function initCamera(videoEl) {
  if (!ENABLE_FACE) return null;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    audio: false,
  });
  if (videoEl) {
    videoEl.srcObject = stream;
    await new Promise((r) => (videoEl.onloadedmetadata = r));
    videoEl.play();
    return videoEl;
  } else {
    const v = document.createElement("video");
    v.autoplay = true; v.muted = true; v.playsInline = true;
    v.style.display = "none";
    document.body.appendChild(v);
    v.srcObject = stream;
    await new Promise((r) => (v.onloadedmetadata = r));
    v.play();
    return v;
  }
}

function stopCamera(videoEl) {
  const v = videoEl || document.querySelector("video[srcObject]");
  const stream = v && v.srcObject;
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((t) => t.stop());
  }
  if (v) v.srcObject = null;
}

async function analyzeAndSend({ mode = "study", text = "", videoEl = null, useCamera = true }) {
  if (!text || typeof text !== "string") {
    throw new Error("text is required for analyzeAndSend");
  }
  const path = ROUTES[mode] || ROUTES.study;

  // Only pass videoEl if enabled and available
  const canUseVideo = ENABLE_FACE && useCamera && videoEl && videoEl.srcObject;

  const { metadata } = await analyzeUserState(text, canUseVideo ? videoEl : null);
  const res = await sendToBackend(path, text, metadata);
  return { metadata, ...res };
}

async function trainModel({ code, filename = "" }) {
  return _trainModel({ code, filename });
}

// Expose as a global for non-module frontends
if (typeof window !== "undefined") {
  window.HumanAI = Object.freeze({
    initCamera,
    stopCamera,
    analyzeAndSend,
    trainModel,
    ROUTES: { ...ROUTES },
  });
}

export { initCamera, stopCamera, analyzeAndSend, trainModel, ROUTES };
