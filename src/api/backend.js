// src/api/backend.js
import { BACKEND_URL, ROUTE_FALLBACKS } from "../config.js";

async function postAndNormalize(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const json = await response.json();
      return { ok: response.ok, status: response.status, reply: json.reply ?? json, raw: json };
    } catch (_) {
      // fallthrough to text
    }
  }

  const text = await response.text();
  const sseLines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().toLowerCase().startsWith("data:"))
    .map((l) => l.replace(/^data:\s*/i, "").trim())
    .filter(Boolean);

  if (!sseLines.length) {
    return { ok: response.ok, status: response.status, reply: text, raw: text };
  }

  const extractedParts = [];
  const fallbackLines = [];

  for (const line of sseLines) {
    if (!line || line === "[DONE]") continue;
    try {
      const payload = JSON.parse(line);
      const chunkPieces = [];

      if (Array.isArray(payload.choices)) {
        for (const choice of payload.choices) {
          const delta = choice?.delta || choice;
          if (typeof delta?.content === "string") {
            chunkPieces.push(delta.content);
          } else if (typeof delta?.text === "string") {
            chunkPieces.push(delta.text);
          } else if (typeof choice?.text === "string") {
            chunkPieces.push(choice.text);
          } else if (typeof choice?.message?.content === "string") {
            chunkPieces.push(choice.message.content);
          } else if (Array.isArray(choice?.message?.content)) {
            for (const part of choice.message.content) {
              if (typeof part?.text === "string") {
                chunkPieces.push(part.text);
              }
            }
          }
        }
      }

      if (typeof payload.reply === "string") {
        chunkPieces.push(payload.reply);
      }
      if (typeof payload.content === "string") {
        chunkPieces.push(payload.content);
      }

      if (chunkPieces.length) {
        extractedParts.push(chunkPieces.join(""));
      } else {
        const fallbackMessage =
          typeof payload.error === "string"
            ? payload.error
            : typeof payload.message === "string"
              ? payload.message
              : null;

        if (fallbackMessage) {
          fallbackLines.push(fallbackMessage);
        } else {
          const roleOnly = Array.isArray(payload.choices) && payload.choices.every((choice) => {
            const delta = choice?.delta || choice;
            return delta && typeof delta.role === "string" && !delta.content && !delta.text;
          });
          if (!roleOnly) {
            fallbackLines.push(line);
          }
        }
      }
    } catch (_) {
      fallbackLines.push(line);
    }
  }

  const reply = extractedParts.length
    ? extractedParts.join("")
    : fallbackLines.length
      ? fallbackLines.join("\n")
      : text;

  return { ok: response.ok, status: response.status, reply, raw: text };
}

export async function sendToBackend(route, query, metadata) {
  // Handle /refactor endpoint which expects "code" instead of "query"
  const body = route === "/refactor" 
    ? { code: query } 
    : { query, metadata };
  
  // First attempt
  const primary = await postAndNormalize(`${BACKEND_URL}${route}`, body);
  if (primary.ok) return primary;

  // Try configured fallback route if available
  const fallbackRoute = ROUTE_FALLBACKS?.[route];
  if (fallbackRoute) {
    try {
      const secondary = await postAndNormalize(`${BACKEND_URL}${fallbackRoute}`, body);
      if (secondary.ok) return secondary;
      return secondary;
    } catch (e) {
      return { ok: false, status: 0, reply: `Network error on fallback: ${e?.message || e}`, raw: null };
    }
  }

  return primary;
}

// Send raw code and/or multiple files to /train endpoint
export async function trainModel({ code = "", files = [] }) {
  // Validate that at least one input is provided
  if (!code && (!files || files.length === 0)) {
    return { ok: false, status: 400, reply: "No code or files provided for training.", raw: null };
  }
  
  const body = {};
  
  // Add code if provided
  if (code && typeof code === "string" && code.trim()) {
    body.code = code.trim();
  }
  
  // Add files if provided
  if (files && Array.isArray(files) && files.length > 0) {
    body.files = files;
  }
  
  try {
    return await postAndNormalize(`${BACKEND_URL}/train`, body);
  } catch (e) {
    return { ok: false, status: 0, reply: `Network error: ${e?.message || e}`, raw: null };
  }
}

// Send personal data to /train_overall endpoint for personalization
export async function trainPersonal(personalData) {
  if (!personalData || typeof personalData !== "string") {
    return { ok: false, status: 400, reply: "No personal data provided.", raw: null };
  }
  const body = { personal_data: personalData };
  try {
    return await postAndNormalize(`${BACKEND_URL}/train_overall`, body);
  } catch (e) {
    return { ok: false, status: 0, reply: `Network error: ${e?.message || e}`, raw: null };
  }
}

// Get stored personal information
export async function getPersonalInfo() {
  try {
    const response = await fetch(`${BACKEND_URL}/get_personal_info`);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      return { ok: response.ok, status: response.status, data: json };
    }
    const text = await response.text();
    return { ok: response.ok, status: response.status, data: text };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: `Network error: ${e?.message || e}` };
  }
}

// Clear all personal information
export async function clearPersonalInfo() {
  try {
    const response = await fetch(`${BACKEND_URL}/clear_personal_info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const json = await response.json();
    return { ok: response.ok, status: response.status, data: json };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: `Network error: ${e?.message || e}` };
  }
}

// Retrieve chat history by session_id
export async function getHistory(sessionId){
  if(!sessionId || typeof sessionId !== 'string'){
    return { ok:false, status:400, data:null, error:'No session_id provided' };
  }
  try{
    return await postAndNormalize(`${BACKEND_URL}/get_history`, { session_id: sessionId });
  }catch(e){
    return { ok:false, status:0, data:null, error:`Network error: ${e?.message || e}` };
  }
}
