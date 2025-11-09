# 🧠 Human + AI Co-Creation - Emotion Detection System

## Features

✅ **Hybrid Emotion Detection**: Combines facial expression + text sentiment  
✅ **Intelligent Fusion**: Confidence-weighted emotion fusion algorithm  
✅ **High Accuracy**: Optimized for real-world lighting and expression detection  
✅ **Graceful Fallbacks**: Works even without camera or with denied permissions  
✅ **Real-time Analysis**: Instant feedback with confidence scores  

---

## 🚀 Quick Start

### 1. Start the Server

```powershell
node server.js
```

### 2. Open in Browser

Navigate to: `http://localhost:8080`

### 3. Allow Camera Access

When prompted, **allow camera access** for facial emotion detection.

---

## 🎭 How Emotion Detection Works

### Three-Layer System

```
┌─────────────────────────────────────────┐
│ 1. FACIAL ANALYSIS (if camera enabled) │
│    - TinyFaceDetector (224px input)    │
│    - FaceExpressionNet (7 emotions)    │
│    - Confidence threshold: 0.5          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. TEXT SENTIMENT ANALYSIS              │
│    - Keyword-based heuristics           │
│    - Patterns: frustrated/happy/neutral │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. INTELLIGENT FUSION                   │
│    - Weighted by confidence             │
│    - Cross-validation between sources   │
│    - Final emotion + source tracking    │
└─────────────────────────────────────────┘
```

### Emotion Mapping

| Face-API Emotion | Our System     | Use Case                    |
|------------------|----------------|----------------------------|
| `angry`          | `frustrated`   | User stuck on problem       |
| `sad`            | `frustrated`   | User discouraged            |
| `disgusted`      | `frustrated`   | User dislikes approach      |
| `fearful`        | `frustrated`   | User anxious about task     |
| `happy`          | `happy`        | User making progress        |
| `surprised`      | `neutral`      | Unexpected but not negative |
| `neutral`        | `neutral`      | Calm, focused state         |

---

## ⚙️ Configuration

### Enable/Disable Features

Edit `src/config.js`:

```javascript
export const ENABLE_FACE = true;        // Facial emotion detection
export const ENABLE_TRANSFORMER = false; // Heavy ML model (disabled for speed)
```

### Camera Settings

In `src/main.js`, camera resolution is set to:

```javascript
{
  width: { ideal: 640 },
  height: { ideal: 480 },
  facingMode: "user"
}
```

**Higher resolution = Better accuracy but slower**

### Face Detection Tuning

In `src/analyzer/faceAnalyzer.js`:

```javascript
new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,      // 128, 160, 224, 320, 416, 512, 608
  scoreThreshold: 0.4  // Lower = more sensitive (0.3-0.7 recommended)
})
```

---

## 🔀 Emotion Fusion Logic

### Decision Tree

```
Face detected with confidence > 0.7?
  └─ YES → Use face emotion
  └─ NO  → Continue...

Face + Text emotions agree?
  └─ YES → High confidence (0.95), source: "text+face"
  └─ NO  → Continue...

Text emotion is strong (not neutral)?
  └─ YES → Use text emotion (confidence: 0.65)
  └─ NO  → Use face if available, else text
```

### Example Scenarios

| Face Result         | Text Emotion  | Final Decision       | Source      |
|---------------------|---------------|----------------------|-------------|
| `angry` (0.8)       | `frustrated`  | `frustrated` (0.95)  | `text+face` |
| `neutral` (0.6)     | `frustrated`  | `frustrated` (0.65)  | `text`      |
| `happy` (0.9)       | `neutral`     | `happy` (0.9)        | `face`      |
| No face detected    | `frustrated`  | `frustrated` (0.6)   | `text`      |

---

## 🐛 Troubleshooting

### Issue: Face always returns "neutral"

**Causes:**
- Low lighting
- Face too far from camera
- Face turned away
- Low confidence detection

**Fixes:**
1. Sit facing a light source
2. Keep face centered in frame
3. Lower `scoreThreshold` to 0.3
4. Increase `inputSize` to 320 or 416

### Issue: Camera permission denied

**System behavior:**
- Falls back to text-only emotion detection
- Shows warning in UI
- No errors, graceful degradation

### Issue: CSP blocks eval()

**Fix:**
Ensure `index.html` has:

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; ...">
```

And server.js sends matching CSP headers.

---

## 📊 Metadata Sent to Backend

```json
{
  "query": "I keep getting errors in my code",
  "metadata": {
    "emotion": "frustrated",
    "emotionConfidence": 0.82,
    "emotionSource": "text+face",
    "skill": "moderate_learner"
  }
}
```

The backend can now:
- Adjust tone (empathetic if frustrated)
- Provide hints vs full solutions based on skill
- Track emotional journey through learning session

---

## 🎯 Accuracy Tips

### For Users

✅ **DO:**
- Sit in well-lit area
- Face camera directly
- Keep face centered in frame
- Use consistent expressions

❌ **DON'T:**
- Cover part of your face
- Have backlit setup (window behind you)
- Use low-res webcam (<480p)

### For Developers

**Improve text detection:**
- Add more keywords to `lightweightModel.js`
- Train custom sentiment model on domain-specific text

**Improve face detection:**
- Switch to higher inputSize (320, 416)
- Use SSD MobileNet instead of TinyFaceDetector
- Add temporal smoothing (average last 3 frames)

---

## 📁 File Structure

```
frontend2/
├── index.html                      # Main UI
├── server.js                       # Dev server with CSP
├── src/
│   ├── config.js                   # Feature flags
│   ├── main.js                     # UI logic
│   ├── analyzer/
│   │   ├── index.js                # Main analyzer orchestrator
│   │   ├── emotionFusion.js        # ★ Fusion algorithm
│   │   ├── faceAnalyzer.js         # ★ Face detection
│   │   ├── textAnalyzer.js         # Text sentiment
│   │   ├── lightweightModel.js     # ★ Keyword-based model
│   │   └── skillAnalyzer.js        # Learner profiling
│   └── api/
│       └── backend.js              # Backend communication
└── public/
    └── models/                     # ★ Face-api.js weights (local)
```

---

## 🚀 Next Steps

### Potential Improvements

1. **Temporal Smoothing**: Average emotions over 3-5 frames to reduce jitter
2. **Attention Detection**: Detect if user is looking away (disengaged)
3. **Blink Rate Analysis**: Fatigue detection
4. **Voice Tone Analysis**: Add microphone emotion detection
5. **Historical Tracking**: Show emotion timeline during session

---

## 🔧 Development

### Run in Development Mode

```powershell
node server.js
```

### Test Without Camera

Set `ENABLE_FACE = false` in `src/config.js`

### Debug Emotion Fusion

Open browser console to see:
- Face detection confidence
- All emotion scores
- Fusion decision logic

---

## 📝 License

MIT

---

**Built with ❤️ for adaptive AI tutoring**

---

## 🚢 Deploying to Replit (Autoscale/Reserved VM)

Use these settings to avoid health check/build failures:

- Build command: leave empty or use `npm install` (do NOT set `node server.js` here)
- Run command: `node server.js` (or `npm start`)
- Health check path: `/health`
- Environment: PORT is provided by Replit; the server listens on `0.0.0.0`

Troubleshooting:
- Health check timeout → ensure `/health` returns 200 (it does in `server.js`)
- Bind errors/ECONNREFUSED → confirm it’s listening on `0.0.0.0` (already configured)
- Blank page → check `index.html` exists at project root and redeploy latest commit

---

## ▲ Deploying to Vercel

This project is a static frontend (no server-side Node framework) plus a simple Node dev server. On Vercel you should deploy it as a static site.

### Recommended Settings

- Framework Preset: "Other"
- Build Command: (leave empty) or `echo "skip"` — there is no build step
- Install Command: `npm install` (optional; no deps required)
- Output Directory: `.` (root) or keep default (since `index.html` is at root)
- Development Command: Leave blank (Vercel will serve static) — do NOT run `node server.js` in production.

### SPA / Pretty Routes
We added `vercel.json` with rewrites so routes like `/app`, `/about`, `/personalization` resolve correctly.

`vercel.json` excerpt:
```jsonc
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/app", "destination": "/public/app/index.html" },
    { "source": "/app/:path*", "destination": "/public/app/index.html" },
    { "source": "/about", "destination": "/public/app/about.html" },
    { "source": "/about-us", "destination": "/public/app/about.html" },
    { "source": "/train", "destination": "/index.html" },
    { "source": "/personalization", "destination": "/index.html" }
  ]
}
```

### Why not use server.js on Vercel?
Vercel’s static hosting is faster and globally cached. `server.js` is only for local development (serving CSP headers and fallbacks). Your HTML already embeds a CSP meta tag, so headers aren’t strictly required.

### Add a Health Check?
For Vercel a health endpoint isn’t needed; the site is static. If required by external monitors, point them to `/`.

### Common Pitfalls
| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on /app | Missing rewrite | Ensure `vercel.json` present at repo root |
| build fails | Nonexistent build step | Leave build blank or use `echo skip` |
| assets 404 | Output directory mis-set | Use root `.` (don’t point to `public/app`) |
| CSP blocked eval | Missing meta CSP | Confirm `<meta http-equiv="Content-Security-Policy" ...>` in `index.html` |

### Optional Optimization
Add a lightweight build step later (e.g., bundling JS) and set Output Directory to `dist/`. For now simplicity wins.

### Quick Deploy (CLI)
If using Vercel CLI:
```powershell
vercel --prod
```
