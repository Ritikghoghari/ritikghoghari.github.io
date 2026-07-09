
import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; 
// Note: OrbitControls removed to prevent user interference with scroll animation, standard for portfolio sites.

// --- 1. SETUP STATE & DATA (The "React" Part) ---

const PORTFOLIO_DATA = [
    {
        id: "jobmarketai",
        title: "JobMarketAI Agent Crew",
        brief: "Multi-Agent Career Assistant.",
        description: "A comprehensive Multi-Agent System powered by Google Gemini and CrewAI. It features a team of AI agents (Recruiter, Security Officer, Career Coach) that analyze resumes, detect fake job postings, and generate tailored application strategies.",
        tags: ["CrewAI", "LLM", "Python"],
        techStack: "Python, CrewAI, Streamlit, Google Gemini, LangChain",
        image: "images/thumb_job_market_ai.png",
        link: "https://github.com/Ritikghoghari/JobMarketAI"
    },
    {
        id: "energy",
        title: "German Energy Forecast",
        brief: "Price prediction via Time Series.",
        description: "Forecasting electricity prices in the German energy market using advanced Time Series forecasting techniques (ARIMA, Prophet, LSTM) to optimize trading strategies.",
        tags: ["Python", "Sequencing"],
        techStack: "Python, Time Series, LSTM, Prophet, Pandas",
        image: "images/thumb_energy_forecast.png",
        link: "https://github.com/Ritikghoghari/German-Energy-Price-Forecasting"
    },
    {
        id: "recruit",
        title: "Smart Recruit Assistant",
        brief: "AI-driven candidate screening.",
        description: "An intelligent recruitment tool that uses NLP to screen resumes and match candidates to job descriptions, streamlining the hiring process.",
        tags: ["Python", "NLP", "AI"],
        techStack: "Python, Natural Language Processing, AI, Streamlit",
        image: "images/thumb_smart_recruit.png",
        link: "https://github.com/Ritikghoghari/Smart-Recruit-Assistant"
    },
    {
        id: "fakejob",
        title: "Fake Job Detector",
        brief: "AI-powered fraud detection system.",
        description: "This project tackles the growing issue of fake job postings. I developed a machine learning model using <strong>Python and Scikit-learn</strong> to analyze job descriptions. The system creates a web application (planned) where users can paste a job URL or description to get a scam probability score.",
        tags: ["Python", "NLP"],
        techStack: "Python, NLP, Machine Learning, Scikit-learn",
        image: "images/fake_job.png",
        link: "https://github.com/Ritikghoghari/Fake-Job-Detection-With-Reasoning"
    },
    {
        id: "book",
        title: "Book Data Analysis",
        brief: "Market insights via EDA.",
        description: "Exploratory Data Analysis of book sales trends to uncover market insights.",
        tags: ["Pandas", "Seaborn"],
        techStack: "Python, Pandas, Seaborn, Matplotlib",
        image: "images/thumb_book.png",
        link: "https://github.com/Ritikghoghari/Book-Sales-Data-Analyst-EDA-"
    },
    {
        id: "airbnb",
        title: "Airbnb Analysis",
        brief: "Pricing strategy & optimization.",
        description: "Market trend analysis and pricing strategy optimization for Airbnb listings.",
        tags: ["Data Analysis"],
        techStack: "Python, Data Analysis, Visualization",
        image: "images/thumb_airbnb.png",
        link: "https://github.com/Ritikghoghari/Airbnb-EDA---Analysis"
    },
    {
        id: "hr",
        title: "HR Data Analysis",
        brief: "Retention metrics dashboard.",
        description: "Dashboarding employee retention metrics.",
        tags: ["Power BI"],
        techStack: "Power BI, Data Visualization",
        image: "images/thumb_hr.png",
        link: "https://github.com/Ritikghoghari/HR-Data-Analysis-Project---Power-BI-Dashboard"
    },
    {
        id: "churn",
        title: "Bank Customer Churn",
        brief: "Predictive retention modeling.",
        description: "Predicting customer churn to improve retention rates using ML models.",
        tags: ["Power BI", "ML"],
        techStack: "Power BI, Predictive Modeling",
        image: "images/thumb_churn.png",
        link: "https://github.com/Ritikghoghari/Bank-Customer-Churn-Analysis---Power-BI-Dashboard"
    },
    {
        id: "heart",
        title: "Heart Disease Analysis",
        brief: "Medical diagnosis prediction.",
        description: "Analysis and prediction of heart disease indicators using Machine Learning techniques to assist in early diagnosis.",
        tags: ["Python", "ML"],
        techStack: "Python, Scikit-learn, Pandas, Data Visualization",
        image: "images/thumb_heart_analysis.png",
        link: "https://github.com/Ritikghoghari/Heart_Disease-Analysis"
    },
    {
        id: "ai-trainer",
        title: "Personal AI Trainer",
        brief: "Real-time CV workout tracker.",
        description: "A real-time Computer Vision application using Python, OpenCV, and MediaPipe to detect posture, calculate joint angles, and automatically count exercise repetitions.",
        tags: ["Python", "OpenCV", "MediaPipe"],
        techStack: "Python, OpenCV, MediaPipe, Computer Vision",
        image: "images/thumb_ai_trainer.png",
        link: "https://github.com/Ritikghoghari/Personal-AI-Trainer"
    },
    {
        id: "primax-test",
        title: "Invoice Data Extractor",
        brief: "AI extraction for invoices.",
        description: "A Python-based AI prototype using Google Gemini to automatically extract B2B invoice data from PDFs into structured JSON formats for ERP integration.",
        tags: ["Python", "Generative AI"],
        techStack: "Python, Google Gemini, PDF Processing, LLM",
        image: "images/thumb_invoice_extractor.png",
        link: "https://github.com/Ritikghoghari/primax-test-project"
    },
    {
        id: "logistics-it",
        title: "Logistics IT Support Analysis",
        brief: "Data analysis for IT support.",
        description: "Data analysis project focusing on interpreting Logistics IT Support metrics and identifying key operational insights.",
        tags: ["Python", "Data Analysis"],
        techStack: "Python, Data Analysis",
        image: "images/thumb_logistics.png",
        link: "https://github.com/Ritikghoghari/Logistics-IT-Support-Analysis"
    },
    {
        id: "car-price",
        title: "Car Price Prediction",
        brief: "Predicting used car prices.",
        description: "Machine Learning project to predict used car selling prices using Linear Regression & Lasso Regression. Built with Python, Pandas, Scikit-learn, Matplotlib & Seaborn.",
        tags: ["Python", "ML"],
        techStack: "Python, Pandas, Scikit-learn, Matplotlib",
        image: "images/thumb_car_price.png",
        link: "https://github.com/Ritikghoghari/CodeAlpha_Car-Price-Prediction"
    },
    {
        id: "iris-flower",
        title: "Iris Flower Classification",
        brief: "Classic ML classification.",
        description: "Classic ML classification project using Random Forest Classifier to classify Iris flowers into Setosa, Versicolor & Virginica species. Achieves 100% accuracy on test set.",
        tags: ["Python", "ML"],
        techStack: "Python, Random Forest, Scikit-learn",
        image: "images/thumb_iris_flower.png",
        link: "https://github.com/Ritikghoghari/CodeAlpha_Iris-Flower-Classification"
    },
    {
        id: "fabric-defect",
        title: "Fabric Defect Classification",
        brief: "Detecting manufacturing defects.",
        description: "Machine Learning classification model aimed at identifying and categorizing different types of defects in fabric images.",
        tags: ["Python", "Computer Vision"],
        techStack: "Python, Machine Learning, Computer Vision",
        image: "images/thumb_fabric_defect.png",
        link: "https://github.com/Ritikghoghari/Fabric-Defect-Classification"
    },
    {
        id: "movie-rec",
        title: "Movie Recommendation System",
        brief: "Personalized movie suggestions.",
        description: "A recommendation system engine built to suggest personalized movie content to users based on viewing habits and ratings.",
        tags: ["Python", "ML"],
        techStack: "Python, Recommendation Engine, Machine Learning",
        image: "images/thumb_movie_rec.png",
        link: "https://github.com/Ritikghoghari/Movie-Recommendation-System"
    }
];

// --- 2. RENDER LOGIC (The "Component" Part) ---

window.renderPortfolio = function () {
    console.log("Initializing Portfolio State...");

    // Render Project Cards
    const galleryTarget = document.querySelector('.project-gallery');
    if (galleryTarget) {
        galleryTarget.innerHTML = PORTFOLIO_DATA.map(project => `
            <div class="project-card" onclick="window.toggleModal('${project.id}')">
                <div class="card-image" style="background-image: url('${project.image}');"></div>
                <div class="card-content">
                    <h4>${project.title}</h4>
                    <p>${project.brief}</p>
                    <div class="tags">
                        ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                    <span class="project-link">View Details &rarr;</span>
                </div>
            </div>
        `).join('');
    }

    // Render Modals Container (Hidden by default)
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-root';
    document.body.appendChild(modalContainer);

    modalContainer.innerHTML = PORTFOLIO_DATA.map(project => `
        <div id="modal-${project.id}" class="modal-overlay" style="display: none;">
            <div class="modal-content">
                <div class="modal-header" style="background-image: url('${project.image}');">
                    <button class="close-btn" onclick="window.toggleModal('${project.id}')">&times;</button>
                </div>
                <div class="modal-body">
                    <h2>${project.title}</h2>
                    <p class="highlight">${project.brief}</p>
                    <hr style="border-color: #333; margin: 20px 0;">
                    <p>${project.description}</p>
                    <br>
                    <p><strong>Tech Stack:</strong> ${project.techStack}</p>
                    <div class="modal-links">
                        <a href="${project.link}" target="_blank" class="cta-button">View Code on GitHub</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
};

// --- 3. INTERACTION HANDLERS ---

window.toggleModal = function (id) {
    if (!id) return;
    const modal = document.getElementById(`modal-${id}`);
    if (!modal) return;

    const isHidden = modal.style.display === 'none';

    if (isHidden) {
        // OPEN
        modal.style.display = 'flex'; // Flex to center
        // Animation (if GSAP available)
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(modal.querySelector('.modal-content'),
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
            );
        }
    } else {
        // CLOSE
        if (typeof gsap !== 'undefined') {
            gsap.to(modal.querySelector('.modal-content'), {
                scale: 0.8, opacity: 0, duration: 0.2,
                onComplete: () => { modal.style.display = 'none'; }
            });
        } else {
            modal.style.display = 'none';
        }
    }
};

// Close on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal-overlay')) {
        // Find which modal relies on this overlay (parent is the modal div itself basically)
        event.target.style.display = 'none';
    }
};


// --- 4. THREE.JS BACKGROUND (The "Engine") ---
// Lightweight particle field + slow data-grid plane (replaces the old torus-knot demo).

function initThreeBackground() {
    const canvas = document.querySelector('#bg');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.set(0, 0, 40);

    // Particle field
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = THREE.MathUtils.randFloatSpread(160);
        positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(160);
        positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(160);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x00f3ff, size: 0.4, transparent: true, opacity: 0.7 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Slow-moving data-grid plane beneath the particles
    const gridGeo = new THREE.PlaneGeometry(220, 220, 24, 24);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x0066ff, wireframe: true, transparent: true, opacity: 0.12 });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = Math.PI / 2.4;
    grid.position.y = -30;
    scene.add(grid);

    // Mouse parallax
    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Scroll
    let scrollT = 0;
    function moveCamera() {
        scrollT = document.body.getBoundingClientRect().top;
    }
    document.body.onscroll = moveCamera;
    moveCamera();

    // Loop
    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.0006;
        particles.rotation.x += 0.0002;
        grid.rotation.z += 0.0003;

        camera.position.x += (mouseX * 4 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 4 - camera.position.y) * 0.02;
        camera.position.z = 40 + scrollT * -0.015;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}


// --- 5. BOOTSTRAP ---

function initApp() {
    console.log("Bootstrapping App...");

    // A. Render UI
    if (typeof window.renderPortfolio === 'function') {
        window.renderPortfolio();
    } else {
        console.error("renderPortfolio function not found!");
    }

    // B. Start 3D
    if (typeof initThreeBackground === 'function') {
        initThreeBackground();
    }

    // C. Static Animations (Safe Mode) - Only if dependencies took
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        // Hero
        gsap.from(".hero-content", { y: 20, opacity: 0, duration: 1, ease: "power2.out" });
        gsap.from(".hero-avatar", { y: 20, opacity: 0, duration: 1, delay: 0.2, ease: "power2.out" });
        // Glass Cards
        gsap.utils.toArray('.glass-card').forEach(card => {
            gsap.from(card, {
                scrollTrigger: { trigger: card, start: "top 90%" },
                y: 30, opacity: 0, duration: 0.8, ease: "power2.out"
            });
        });
        // Skill items stagger
        gsap.from(".skill-item", {
            scrollTrigger: { trigger: ".skills-grid", start: "top 85%" },
            y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out"
        });
        // Project cards stagger
        gsap.from(".project-card", {
            scrollTrigger: { trigger: ".project-gallery", start: "top 85%" },
            y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out"
        });
    }

    // D. Init Typewriter
    initTypewriter();

    // E. Mobile Nav Drawer
    initNavDrawer();
}

// --- MOBILE NAV DRAWER ---
function initNavDrawer() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// --- 6. TYPEWRITER EFFECT ---
const TypeWriter = function (txtElement, words, wait = 3000) {
    this.txtElement = txtElement;
    this.words = words;
    this.txt = '';
    this.wordIndex = 0;
    this.wait = parseInt(wait, 10);
    this.type();
    this.isDeleting = false;
}

TypeWriter.prototype.type = function () {
    // Current index of word
    const current = this.wordIndex % this.words.length;
    // Get full text of current word
    const fullTxt = this.words[current];

    // Check if deleting
    if (this.isDeleting) {
        // Remove char
        this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
        // Add char
        this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    // Insert txt into element
    this.txtElement.innerHTML = `<span class="txt">${this.txt}</span>`;

    // Initial Type Speed
    let typeSpeed = 100;

    if (this.isDeleting) {
        typeSpeed /= 2;
    }

    // If word is complete
    if (!this.isDeleting && this.txt === fullTxt) {
        // Make pause at end
        typeSpeed = this.wait;
        // Set delete to true
        this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
        this.isDeleting = false;
        // Move to next word
        this.wordIndex++;
        // Pause before start typing
        typeSpeed = 500;
    }

    setTimeout(() => this.type(), typeSpeed);
}

function initTypewriter() {
    const txtElement = document.querySelector('.txt-type');
    if (txtElement) {
        const words = JSON.parse(txtElement.getAttribute('data-words'));
        const wait = txtElement.getAttribute('data-wait');
        new TypeWriter(txtElement, words, wait);
    }
}

// Robust Init: Check if we missed the event or if it's coming
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already ready (likely, since modules are deferred)
    initApp();
}

// SAFETY FALLBACK: Force render after a short delay just in case
// This fixes cases where the browser reports 'loading' but misses the event
setTimeout(() => {
    if (!document.querySelector('.project-card')) {
        console.warn("Safety Render Triggered");
        initApp();
    }
}, 300);

// --- ACTIVE NAV HIGHLIGHT ---
const navLinks = document.querySelectorAll('nav ul a[href^="#"]');
const navSections = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

if (navSections.length) {
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                const activeLink = document.querySelector(`nav ul a[href="#${entry.target.id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, { rootMargin: '-40% 0px -50% 0px' });

    navSections.forEach(section => navObserver.observe(section));
}

// --- FLOATING CHAT WIDGET ---
const WEB3FORMS_ACCESS_KEY = "fc739b37-dd65-43a9-8ce3-c762edb249a5";

const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatPanel = document.getElementById('chat-panel');
const chatIconOpen = document.getElementById('chat-icon-open');
const chatIconClose = document.getElementById('chat-icon-close');
const chatForm = document.getElementById('chat-form');
const chatSubmitBtn = document.getElementById('chat-submit-btn');
const chatStatusEl = document.getElementById('chat-status');

const chatFields = {
    name: { input: document.getElementById('cf-name'), error: document.getElementById('cf-name-error') },
    email: { input: document.getElementById('cf-email'), error: document.getElementById('cf-email-error') },
    message: { input: document.getElementById('cf-message'), error: document.getElementById('cf-message-error') }
};

if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => {
        const isOpen = !chatPanel.classList.contains('hidden');
        chatPanel.classList.toggle('hidden');
        chatIconOpen.style.display = isOpen ? 'block' : 'none';
        chatIconClose.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) chatFields.name.input.focus();
    });
}

function setFieldError(field, message) {
    chatFields[field].error.textContent = message;
    chatFields[field].input.classList.toggle('invalid', !!message);
}

function validateChatForm() {
    let valid = true;

    const name = chatFields.name.input.value.trim();
    if (!name) {
        setFieldError('name', 'Please enter your name.');
        valid = false;
    } else {
        setFieldError('name', '');
    }

    const email = chatFields.email.input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        setFieldError('email', 'Please enter a valid email address.');
        valid = false;
    } else {
        setFieldError('email', '');
    }

    const message = chatFields.message.input.value.trim();
    if (!message) {
        setFieldError('message', 'Please write a short message.');
        valid = false;
    } else {
        setFieldError('message', '');
    }

    return valid;
}

if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Honeypot: bots fill this hidden field, humans never see it
        const honeypot = document.getElementById('cf-hp').value;
        if (honeypot) return;

        if (!validateChatForm()) return;

        chatSubmitBtn.disabled = true;
        chatSubmitBtn.classList.add('sending');
        chatStatusEl.textContent = 'Sending...';
        chatStatusEl.className = 'chat-status';

        const formData = new FormData();
        formData.append("access_key", WEB3FORMS_ACCESS_KEY);
        formData.append("name", chatFields.name.input.value.trim());
        formData.append("email", chatFields.email.input.value.trim());
        formData.append("message", chatFields.message.input.value.trim());

        fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    chatStatusEl.textContent = "Thanks! I'll get back to you soon 🚀";
                    chatStatusEl.className = 'chat-status success';
                    chatForm.reset();
                } else {
                    chatStatusEl.textContent = "Something went wrong. Please email me directly.";
                    chatStatusEl.className = 'chat-status error';
                }
            })
            .catch(() => {
                chatStatusEl.textContent = "Network error. Please email me directly.";
                chatStatusEl.className = 'chat-status error';
            })
            .finally(() => {
                chatSubmitBtn.disabled = false;
                chatSubmitBtn.classList.remove('sending');
            });
    });
}
