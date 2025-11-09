// src/config.js
// Feature flags and runtime configuration
// Toggle facial analysis on/off. When false, no face-api model downloads will be attempted.
export const ENABLE_FACE = true;

// Toggle transformer-based sentiment model. When false, we skip remote model
// downloads entirely and use the lightweight heuristic model only.
export const ENABLE_TRANSFORMER = false;

// Timeout for transformer inference (ms)
export const TRANSFORMER_TIMEOUT_MS = 3500;

// Backend configuration
// Correct URL has double 'ii' (human-aii)
export const BACKEND_URL = "https://swayamshetkar-human-aii.hf.space";

// Optional route fallbacks: if a route fails (e.g., /ask_stream -> 500),
// try a non-stream variant automatically.
// Disabled for now - backend routes need to be confirmed
export const ROUTE_FALLBACKS = {
	// "/ask_stream": "/ask",
};