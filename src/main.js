// src/main.js
import { analyzeUserState } from "./analyzer/index.js";
import { sendToBackend, trainModel, trainPersonal, getPersonalInfo, clearPersonalInfo } from "./api/backend.js";
import { ENABLE_FACE } from "./config.js";

const input = document.getElementById("input");
const video = document.getElementById("camera");
const output = document.getElementById("output");
const analyzeBtn = document.getElementById("analyze");
const emotionText = document.getElementById("emotion-text");
const confidenceText = document.getElementById("confidence-text");
const sourceText = document.getElementById("source-text");

// Sections & train controls
const appSection = document.getElementById("app-section");
const trainSection = document.getElementById("train-section");
const navTrain = document.getElementById("nav-train");
const trainCode = document.getElementById("train-code");
const trainFile = document.getElementById("train-file");
const trainFileStatus = document.getElementById("train-file-status");
const trainSubmit = document.getElementById("train-submit");
const trainClear = document.getElementById("train-clear");
const trainResult = document.getElementById("train-result");
const trainFilesList = document.getElementById("train-files-list");
const trainFilesItems = document.getElementById("train-files-items");

// Personalization section controls
const personalizationSection = document.getElementById("personalization-section");
const navPersonalization = document.getElementById("nav-personalization");
const personalData = document.getElementById("personal-data");
const personalSubmit = document.getElementById("personal-submit");
const personalView = document.getElementById("personal-view");
const personalClear = document.getElementById("personal-clear");
const personalResult = document.getElementById("personal-result");
const personalStats = document.getElementById("personal-stats");
const statsEntries = document.getElementById("stats-entries");
const statsChars = document.getElementById("stats-chars");

let selectedMode = "study"; // default mode

// MODE SELECTION
document.getElementById("mode-study").onclick = () => setMode("study");
document.getElementById("mode-code").onclick = () => setMode("code");
document.getElementById("mode-refactor").onclick = () => setMode("refactor");

function setMode(mode) {
  selectedMode = mode;
  output.innerText = `Mode selected: ${mode.toUpperCase()}`;
}

function getEmotionEmoji(emotion) {
  const emojiMap = {
    happy: "😊",
    frustrated: "😠",
    neutral: "😐"
  };
  return emojiMap[emotion] || "🤔";
}

// Start webcam only if facial analysis is enabled
if (ENABLE_FACE) {
  navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user"
    }
  })
    .then(stream => {
      video.srcObject = stream;
      console.log("📹 Camera started:", stream.getVideoTracks()[0].getSettings());
    })
    .catch(err => {
      console.warn("Camera error (permission or device):", err?.name || err);
      output.innerText = "⚠️ Camera access denied. Emotion detection will use text only.";
    });
}

// Handle AI request
analyzeBtn.onclick = async () => {
  const text = input.value.trim();
  if (!text) {
    output.innerText = "Please enter some text or code.";
    return;
  }

  output.innerText = "Analyzing...";
  emotionText.innerText = "Detecting...";
  
  let metadata;
  try {
    const isVideoActive = ENABLE_FACE && !!(video && video.srcObject && video.srcObject.getVideoTracks && video.srcObject.getVideoTracks().some(t => t.readyState === "live"));
    const result = await analyzeUserState(text, isVideoActive ? video : null);
    metadata = result.metadata;
    
    // Update emotion display
    emotionText.innerText = `${metadata.emotion.toUpperCase()} ${getEmotionEmoji(metadata.emotion)}`;
    confidenceText.innerText = `${(metadata.emotionConfidence * 100).toFixed(0)}%`;
    sourceText.innerText = metadata.emotionSource;
  } catch (err) {
    console.warn("Full user state analysis failed; falling back to text-only.", err);
    // Fallback: text only analysis without video (face model may have failed)
    try {
      const { analyzeText } = await import("./analyzer/textAnalyzer.js");
      metadata = await analyzeText(text);
    } catch (inner) {
      console.error("Text analysis fallback also failed.", inner);
      metadata = { emotion: "neutral", skill: "moderate_learner" };
    }
  }

  // Choose backend route
  let route = "/ask";
  if (selectedMode === "code") route = "/code_assist";
  else if (selectedMode === "refactor") route = "/refactor";

  // Send to backend
  const res = await sendToBackend(route, text, metadata);
  if (!res.ok) {
    output.innerText = JSON.stringify({
      mode: selectedMode,
      metadata,
      error: true,
      status: res.status,
      reply: res.reply,
    }, null, 2);
    return;
  }
  output.innerText = JSON.stringify({ mode: selectedMode, metadata, reply: res.reply }, null, 2);
};

// -----------------------------
// Minimal client-side router
// -----------------------------
function renderRoute(pathname) {
  const isTrain = pathname === "/train";
  const isPersonalization = pathname === "/personalization";
  
  if (appSection) appSection.style.display = (isTrain || isPersonalization) ? "none" : "block";
  if (trainSection) trainSection.style.display = isTrain ? "block" : "none";
  if (personalizationSection) personalizationSection.style.display = isPersonalization ? "block" : "none";
}

// Intercept train nav to use SPA routing
if (navTrain) {
  navTrain.addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState({}, "train", "/train");
    renderRoute("/train");
  });
}

// Intercept personalization nav to use SPA routing
if (navPersonalization) {
  navPersonalization.addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState({}, "personalization", "/personalization");
    renderRoute("/personalization");
  });
}

window.addEventListener("popstate", () => renderRoute(location.pathname));
// Initial render
renderRoute(location.pathname);

// -----------------------------
// Train: file and submit handlers
// -----------------------------
let selectedFiles = [];

if (trainFile) {
  trainFile.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) {
      trainFileStatus.textContent = "";
      trainFilesList.style.display = "none";
      selectedFiles = [];
      return;
    }
    
    selectedFiles = files;
    
    // Update status
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    trainFileStatus.textContent = `Selected ${files.length} file(s) - Total: ${Math.round(totalSize/1024)} KB`;
    
    // Show files list
    trainFilesList.style.display = "block";
    trainFilesItems.innerHTML = files
      .map(f => `<li>${f.name} (${Math.round(f.size/1024)} KB)</li>`)
      .join("");
    
    // If only one file and textarea is empty, auto-fill
    if (files.length === 1 && !trainCode.value.trim()) {
      try {
        const text = await files[0].text();
        trainCode.value = text;
      } catch (err) {
        console.warn("Failed to auto-fill from file:", err);
      }
    }
  });
}

if (trainClear) {
  trainClear.onclick = () => {
    trainCode.value = "";
    if (trainFile) trainFile.value = "";
    trainFileStatus.textContent = "";
    trainResult.textContent = "";
    if (trainFilesList) trainFilesList.style.display = "none";
    if (trainFilesItems) trainFilesItems.innerHTML = "";
    selectedFiles = [];
  };
}

if (trainSubmit) {
  trainSubmit.onclick = async () => {
    const code = trainCode.value.trim();
    
    if (!code && selectedFiles.length === 0) {
      trainResult.textContent = "⚠️ Please paste code or select at least one file.";
      return;
    }
    
    trainResult.textContent = "📤 Processing files and sending to /train...";
    
    try {
      // Process all selected files
      const filesData = [];
      for (const file of selectedFiles) {
        try {
          const content = await file.text();
          filesData.push({
            filename: file.name,
            content: content
          });
        } catch (err) {
          trainResult.textContent = `❌ Failed to read file ${file.name}: ${err?.message || err}`;
          return;
        }
      }
      
      // Send to backend
      const res = await trainModel({ 
        code: code || undefined, 
        files: filesData.length > 0 ? filesData : undefined 
      });
      
      if (!res.ok) {
        trainResult.textContent = `❌ Error (${res.status}): ${typeof res.reply === 'string' ? res.reply : JSON.stringify(res.reply, null, 2)}`;
        return;
      }
      
      // Format success response
      const response = typeof res.reply === 'string' ? JSON.parse(res.reply) : res.reply;
      
      let resultText = `✅ ${response.message}\n\n`;
      resultText += `📊 Training Summary:\n`;
      resultText += `  • Files processed: ${response.files_processed}\n`;
      resultText += `  • Total characters: ${response.total_characters.toLocaleString()}\n\n`;
      
      if (response.files && response.files.length > 0) {
        resultText += `📁 Processed Files:\n`;
        response.files.forEach(f => {
          resultText += `  • ${f.filename} (${f.size.toLocaleString()} chars)\n`;
        });
        resultText += `\n`;
      }
      
      resultText += `🎨 Updated Coding Style:\n${JSON.stringify(response.coding_style, null, 2)}\n\n`;
      resultText += `🔍 Updated Fingerprint:\n${JSON.stringify(response.fingerprint, null, 2)}`;
      
      trainResult.textContent = resultText;
      
    } catch (e) {
      trainResult.textContent = `❌ Failed to send: ${e?.message || e}`;
    }
  };
}

// -----------------------------
// Personalization handlers
// -----------------------------
if (personalSubmit) {
  personalSubmit.onclick = async () => {
    const data = personalData.value.trim();
    if (!data) {
      personalResult.textContent = "⚠️ Please enter some personal information first.";
      return;
    }
    
    personalResult.textContent = "💾 Saving personal information...";
    try {
      const res = await trainPersonal(data);
      if (!res.ok) {
        personalResult.textContent = `❌ Error (${res.status}): ${typeof res.reply === 'string' ? res.reply : JSON.stringify(res.reply, null, 2)}`;
        return;
      }
      
      const response = typeof res.reply === 'string' ? JSON.parse(res.reply) : res.reply;
      personalResult.textContent = `✅ ${response.message}\n\n📊 Stats:\n` +
        `- Entries saved: ${response.entry_count}\n` +
        `- Total characters: ${response.total_characters}\n\n` +
        `Preview: ${response.preview}`;
      
      // Update stats display
      if (personalStats) {
        personalStats.style.display = "block";
        statsEntries.textContent = `Entries: ${response.entry_count}`;
        statsChars.textContent = `Characters: ${response.total_characters}`;
      }
      
      // Clear textarea after successful save
      personalData.value = "";
    } catch (e) {
      personalResult.textContent = `❌ Failed to save: ${e?.message || e}`;
    }
  };
}

if (personalView) {
  personalView.onclick = async () => {
    personalResult.textContent = "🔍 Loading personal information...";
    try {
      const res = await getPersonalInfo();
      if (!res.ok) {
        personalResult.textContent = `❌ Error (${res.status}): ${res.error || 'Failed to load'}`;
        return;
      }
      
      const info = res.data;
      if (!info.raw_data) {
        personalResult.textContent = "ℹ️ No personal information stored yet.";
        if (personalStats) personalStats.style.display = "none";
        return;
      }
      
      personalResult.textContent = `📋 Stored Personal Information:\n\n${info.raw_data}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Total entries: ${info.entry_count} | Characters: ${info.total_characters}`;
      
      // Update stats display
      if (personalStats) {
        personalStats.style.display = "block";
        statsEntries.textContent = `Entries: ${info.entry_count}`;
        statsChars.textContent = `Characters: ${info.total_characters}`;
      }
    } catch (e) {
      personalResult.textContent = `❌ Failed to load: ${e?.message || e}`;
    }
  };
}

if (personalClear) {
  personalClear.onclick = async () => {
    if (!confirm("⚠️ Are you sure you want to delete ALL personal information? This cannot be undone!")) {
      return;
    }
    
    personalResult.textContent = "🗑️ Clearing personal information...";
    try {
      const res = await clearPersonalInfo();
      if (!res.ok) {
        personalResult.textContent = `❌ Error (${res.status}): ${res.error || 'Failed to clear'}`;
        return;
      }
      
      personalResult.textContent = `✅ ${res.data.message}`;
      personalData.value = "";
      
      // Hide stats
      if (personalStats) personalStats.style.display = "none";
    } catch (e) {
      personalResult.textContent = `❌ Failed to clear: ${e?.message || e}`;
    }
  };
}
