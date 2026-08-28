# FastTracker — Intermittent Fasting PWA

A clean, mobile-first, zero-dependency Progressive Web App (PWA) to track intermittent fasting with live metabolic stage progress.

---

## ✨ Features

- ⏱ **Interactive Circular Fasting Timer**:
  - Live progress ring with percentage calculation and remaining time countdown.
  - Automatic transition to **Overtime Mode** once the target fasting goal is met.
  - Dedicated **Eating Window Mode** when a fast is completed.
  - Retroactive start-time editing to adjust whenever you started eating earlier.

- 🧬 **Metabolic Stage Milestones**:
  - Live highlights as you progress through physiological stages:
    1. **0–4h**: Blood Sugar Rise & Digestion
    2. **4–8h**: Insulin Drop & Glycogen Utilization
    3. **8–12h**: Glycogen Depletion & Fat Mobilization
    4. **12–16h**: Ketosis Zone Initiation
    5. **16–24h**: Autophagy & Cellular Cleanup
    6. **24h+**: Extended Deep Fast & Growth Hormone Surge

- 🎯 **Protocols & Custom Targets**:
  - Quick protocol presets: `14:10`, `16:8` (default), `18:6`, `20:4 (Warrior)`, and `24h (OMAD)`.
  - Custom target modal for any duration between 1 and 168 hours.

- 📊 **Analytics & History**:
  - Streak tracking (current & longest consecutive fasting streaks).
  - Total fasts, average duration, and target achievement rate.
  - Manual past-fast logger and entry deletion.
  - Complete JSON Data Export and Import for offline backups.

- 📱 **PWA & Offline-First**:
  - Standalone home screen installation on iOS and Android.
  - Service worker caching (`sw.js`) with instant cache-first loading.
  - Web Notifications for fast goal completion and stage milestones.

---

## 🚀 Quick Start (Local Preview)

Run a simple local HTTP server from the project root:

```bash
cd fasting-pwa
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

To install as a PWA on mobile:
- **iOS Safari**: Tap **Share** -> **Add to Home Screen**.
- **Android Chrome**: Tap the three-dot menu -> **Install app** or **Add to Home screen**.
