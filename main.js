
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

function initThreeBackground() {
    const canvas = document.querySelector('#bg');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    // Geometry
    const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0055, wireframe: true });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    const coreGeo = new THREE.IcosahedronGeometry(2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(-15, 0, 5);
    scene.add(core);

    // Particles
    function addStar() {
        const geometry = new THREE.SphereGeometry(0.15, 24, 24);
        const material = new THREE.MeshStandardMaterial({ color: 0x00f3ff });
        const star = new THREE.Mesh(geometry, material);
        const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(150));
        star.position.set(x, y, z);
        scene.add(star);
    }
    Array(300).fill().forEach(addStar);

    // Light
    const pointLight = new THREE.PointLight(0xffffff, 20, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight, new THREE.AmbientLight(0xffffff));

    // Scroll
    function moveCamera() {
        const t = document.body.getBoundingClientRect().top;
        torusKnot.rotation.x += 0.01;
        torusKnot.rotation.y += 0.025;
        camera.position.z = t * -0.01 + 30;
        camera.position.x = t * -0.0002;
        camera.rotation.y = t * -0.0002;
    }
    document.body.onscroll = moveCamera;
    moveCamera();

    // Loop
    function animate() {
        requestAnimationFrame(animate);
        torusKnot.rotation.x += 0.005;
        torusKnot.rotation.y += 0.002;
        core.rotation.x -= 0.01;
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
        // Glass Cards
        gsap.utils.toArray('.glass-card').forEach(card => {
            gsap.from(card, {
                scrollTrigger: { trigger: card, start: "top 90%" },
                y: 30, opacity: 0, duration: 0.8, ease: "power2.out"
            });
        });
    }

    // D. Init Typewriter
    initTypewriter();
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

// --- CHATBOT LOGIC ---
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessages = document.getElementById('chat-messages');

let chatState = 'ask_name';
let userData = {
    name: '',
    email: '',
    message: ''
};

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleInput() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, 'user');
    chatInput.value = '';

    // Process logic based on state
    if (chatState === 'ask_name') {
        userData.name = text;
        chatState = 'ask_email';
        setTimeout(() => addMessage(`Nice to meet you, ${userData.name}! Please provide your email address so Ritik can reply to you.`, 'bot'), 500);
    } else if (chatState === 'ask_email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(text)) {
            setTimeout(() => addMessage("That doesn't look like a valid email. Please try again.", 'bot'), 500);
            return;
        }
        userData.email = text;
        chatState = 'ask_message';
        setTimeout(() => addMessage("Thanks! What would you like to send him?", 'bot'), 500);
    } else if (chatState === 'ask_message') {
        userData.message = text;
        chatState = 'sending';
        setTimeout(() => addMessage("encrypting and sending your message...", 'bot'), 500);
        
        // Send via Web3Forms
        const formData = new FormData();
        formData.append("access_key", "fc739b37-dd65-43a9-8ce3-c762edb249a5");
        formData.append("name", userData.name);
        formData.append("email", userData.email);
        formData.append("message", userData.message);

        fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                addMessage("Message securely transmitted! Ritik will get back to you shortly.", 'bot');
                chatState = 'done';
            } else {
                addMessage("Error sending message. Please use the email link below.", 'error');
                chatState = 'done';
            }
        })
        .catch(err => {
            addMessage("Network Error. Please use the email link below.", 'error');
            chatState = 'done';
        });
    } else if (chatState === 'done') {
        setTimeout(() => addMessage("I have already sent your message. If you need anything else, please email Ritik directly.", 'bot'), 500);
    }
}

if(chatSendBtn) {
    chatSendBtn.addEventListener('click', handleInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleInput();
    });
}
