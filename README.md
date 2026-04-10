# 🧩 Spatial Escape — AR Puzzle Hunt

An immersive **Augmented Reality (AR) escape room experience** powered by real-time computer vision, spatial audio, and interactive puzzles.  
Use your camera to explore the real world, detect hidden targets, and solve riddles to escape.

---

## 📌 1. About the Project

**Spatial Escape** is a mobile-first AR puzzle game that blends:

- 📷 Real-world scanning
- 🧠 Computer vision (AI-based detection)
- 🎮 Game mechanics (progression, scoring, puzzles)
- 🎧 Spatial audio feedback

### 💡 Concept

Instead of interacting with a virtual world, **the real world becomes your game environment**.

Players must:

- Physically move around
- Find real-world objects (light, plants, shadows, etc.)
- Unlock puzzles tied to those objects
- Solve riddles to progress

---

## 🎮 2. How the Project Works

### 🚀 How to Play

1. Open the app and grant **camera access**
2. A hint appears telling you what to find (e.g., *"Find a dark place"*)
3. Point your camera at the correct real-world object
4. Hold steady → the scanning ring fills up
5. Once detected → a puzzle appears
6. Solve the riddle within time
7. Repeat for all 5 fragments to escape

---

### 📜 Game Rules

- ⏳ Each puzzle has a **30-second timer**
- 🧠 Faster answers = more points
- ❌ Wrong answers increase error count
- 💡 Hints unlock after multiple wrong attempts (cost points)
- 🧩 Complete all 5 puzzles to win
- 🏆 Final score = total points − hints used

---

## 🧪 3. Tech Stack

### 🖥️ Frontend

- **React (TypeScript)**
- **Vite**

### 🎨 Graphics & AR

- **Three.js**
- **@react-three/fiber**

### 🧠 Computer Vision

- **MediaPipe (Image Segmenter)**
- Real-time semantic segmentation

### 🎧 Audio

- **Web Audio API**
- Spatial (3D positional) sound

### 🎨 Styling

- **CSS + Tailwind base setup**

---

## ✨ 4. Features

### 🔍 Real-World Scanning

Detects:

- Darkness
- Bright light
- Furniture (chairs)
- Plants
- Humans

---

### 🧠 AI-Powered Vision

- Semantic segmentation using MediaPipe
- Pixel-level analysis for:
  - Brightness
  - Object categories
  - Color detection (green for plants)

---

### 🧭 Path Guidance System

- Real-time walkable path detection
- Dynamic obstacle highlighting
- Animated directional arrows

---

### 🎧 Spatial Audio Feedback

- 3D positional sound cues
- Direction-based alerts
- Haptic vibration for danger

---

### 🎮 Game Mechanics

- Progressive puzzles (5 levels)
- Timer-based scoring system
- Hint system with penalties
- Victory screen with rating

---

### 📱 Mobile AR Experience

- Gyroscope-based camera movement
- Full-screen immersive UI
- Optimized for mobile browsers

---

## 🛠️ 5. Installation & Setup

### 📦 Prerequisites

- Node.js (v16 or above)
- npm or yarn
- Mobile device (recommended)
- HTTPS environment (required for camera access)

---

### ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/spatial-escape.git

# Navigate into the project
cd spatial-escape

# Install dependencies
npm install
```

### ▶️ Run Locally

```bash
npm run dev
```

### 🌐 Access on Mobile

1. Find your local IP:

```bash
ipconfig   # Windows
ifconfig   # Mac/Linux
```

2. Open on phone:
http://YOUR-IP:5173

### ⚠️ Important Notes

- 📷 Camera requires HTTPS on mobile browsers
- 🍎 iOS Safari requires user interaction before audio plays
- 🎧 Tap once anywhere to enable audio

---

## 📁 6. Project Structure & File Roles

### 🔹 Core App

| File | Role |
|------|------|
| `main.tsx` | Entry point, renders React app |
| `App.tsx` | Main game controller (state, flow, progression) |

### 🔹 AR & Vision

| File | Role |
|------|------|
| `ARScene.tsx` | Core AR engine (camera, scanning, rendering, logic) |
| `useVision.ts` | Computer vision (MediaPipe integration, detection logic) |
| `SpatialAudio.ts` | 3D positional audio system |

### 🔹 Game Logic

| File | Role |
|------|------|
| `EscapeLogic.ts` | Defines puzzles, scan types, riddles, answers |

### 🔹 UI Components

| File | Role |
|------|------|
| `IntroScreen.tsx` | Start screen + instructions |
| `Overlay.tsx` | HUD (status, hints, progress) |
| `PuzzleUI.tsx` | Puzzle interaction (timer, input, hints) |
| `VictoryScreen.tsx` | Final score + results |

### 🔹 Visual Effects

| File | Role |
|------|------|
| `FloorShader.ts` | Grid floor shader |
| `PathShader.ts` | Scan ring shader |

### 🔹 Styling

| File | Role |
|------|------|
| `App.css` | Layout, layering, z-index control |
| `index.css` | Base styles, Tailwind setup |

---

### 🧠 How Everything Connects
Camera Feed → useVision (AI)
→ ARScene (processing + rendering)
→ Scan Detection → PuzzleUI
→ Solve → App State → Next Puzzle
→ VictoryScreen

---

## 🚧 Known Limitations

- Requires good lighting for detection accuracy
- Performance depends on device capability
- iOS has strict audio + camera restrictions
- Works best in mobile browsers (not desktop)

---

## 🔮 Future Improvements

- 🌍 Multiplayer mode
- 🧠 More advanced object detection
- 🎨 Enhanced AR visuals
- 🗺️ Location-based puzzles
- 🎤 Voice-based interaction

---

## 🙌 Credits

- [MediaPipe](https://mediapipe.dev/) (Google) for vision models
- [Three.js](https://threejs.org/) for 3D rendering
- React ecosystem

---

## 🏁 Final Note

This project demonstrates how real-world environments can become interactive game spaces using modern web technologies.

> *"The world is your puzzle."*