# 3D Data Scientist Portfolio 🧬

> A fully interactive, 3D portfolio website built for a Data Scientist & Developer. Featuring a dynamic particle starfield, glassmorphism UI, and robust state-based architecture.

![Portfolio Preview](images/uploaded_image_1768614745084.png)

## 🚀 Live Demo
**[View Live Portfolio](https://ritikghoghari.github.io)**

## ✨ Features

-   **Interactive 3D Background**: Built with **Three.js**, featuring a rotating torus knot and a responsive particle system that reacts to scroll and mouse movement.
-   **Glassmorphism Design**: Modern, frosted-glass UI elements with neon accents (Cyan & Pink cyberpunk aesthetic).
-   **Robust Architecture**: 
    -   Uses a "React-style" Vanilla JS approach.
    -   **Single Source of Truth**: All project data is managed in a central state array.
    -   **Dynamic Rendering**: Code automatically generates project cards and modals, ensuring zero synchronization bugs.
-   **Performance Optimized**: 
    -   Smart initialization logic (checking `document.readyState`).
    -   CSS-based visibility fallbacks (works even if JS is slow).
    -   Hardware-accelerated animations.

## 🛠️ Tech Stack

-   **Core**: HTML5, Modern CSS3 (Variables, Flexbox, Grid)
-   **Logic**: Vanilla JavaScript (ES6+ Modules)
-   **3D Engine**: [Three.js](https://threejs.org/) (via CDN)
-   **Animations**: [GSAP](https://gsap.com/) (ScrollTrigger)
-   **Design**: Custom CSS Glassmorphism & Neon Glow effects

## 📂 Project Structure

```bash
.
├── index.html       # Main entry point (Dynamic Containers)
├── style.css        # Global styles, variables, and responsive design
├── main.js          # Core logic (State, 3D Scene, Data Rendering)
└── images/          # Project thumbnails and assets
```

## 🎨 Acknowledgements

Designed and developed by **Ritik Ghoghari**.
-   Fonts: *Orbitron* (Headers), *Rajdhani* (Body) from Google Fonts.
-   Icons: Custom SVG integration.

---
&copy; 2026 Ritik Ghoghari
