
import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; 
// Note: OrbitControls removed to prevent user interference with scroll animation, standard for portfolio sites.

// --- 1. SETUP STATE & DATA (The "React" Part) ---

const PORTFOLIO_DATA = [
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
        image: "images/thumb_heart.png",
        link: "https://github.com/Ritikghoghari/Heart_Disease-Analysis"
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
