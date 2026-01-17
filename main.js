import * as THREE from 'three';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    alpha: true,
    antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

// --- Objects ---

// 1. Starfield Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000; // lots of particles

const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    // Spread particles in a wide area
    posArray[i] = (Math.random() - 0.5) * 100;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

// Create a material for the particles (glowing dots)
// Since we don't have a texture loader setup with a file, we use a simple point material
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.15,
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.8,
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// 2. Geometric Shapes (Decorations)
const geometry = new THREE.IcosahedronGeometry(10, 1);
const material = new THREE.MeshStandardMaterial({ 
    color: 0x0066ff,
    wireframe: true,
});
const sphere = new THREE.Mesh(geometry, material);
sphere.position.set(-20, 0, -10);
scene.add(sphere);

const geometry2 = new THREE.TorusKnotGeometry(10, 3, 100, 16);
const material2 = new THREE.MeshStandardMaterial({ 
    color: 0xff0066,
    wireframe: true,
});
const torus = new THREE.Mesh(geometry2, material2);
torus.position.set(20, 10, -20);
scene.add(torus);


// --- Lighting ---
const pointLight = new THREE.PointLight(0xffffff, 200, 100);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(pointLight, ambientLight);

// --- Helpers (optional, commented out for prod) ---
// const lightHelper = new THREE.PointLightHelper(pointLight);
// const gridHelper = new THREE.GridHelper(200, 50);
// scene.add(lightHelper, gridHelper);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Rotate decorations
    sphere.rotation.x += 0.002;
    sphere.rotation.y += 0.002;

    torus.rotation.x -= 0.005;
    torus.rotation.y -= 0.005;
    torus.rotation.z -= 0.005;

    // Rotate entire particle system slowly
    particlesMesh.rotation.y += 0.0005;
    particlesMesh.rotation.x += 0.0002;

    renderer.render(scene, camera);
}

animate();


// --- Interaction ---

// 1. Scroll Effect (Move Camera)
function moveCamera() {
    const t = document.body.getBoundingClientRect().top;

    // Rotate sphere on scroll
    sphere.rotation.x += 0.01;
    sphere.rotation.y += 0.01;

    // Move camera
    camera.position.z = t * -0.05 + 30; // base Z is 30
    camera.position.x = t * -0.0002;
    camera.rotation.y = t * -0.0002;
}

document.body.onscroll = moveCamera;

// 2. Mouse Parallax
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
    
    // Tiny parallax on particle mesh
    particlesMesh.rotation.y = mouseX * 0.1;
    particlesMesh.rotation.x = mouseY * 0.1;
});

// 3. Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- GSAP Animations (Text Reveals) ---
// Wait for GSAP to load from CDN
window.addEventListener('load', () => {
    gsap.registerPlugin(ScrollTrigger);

    // Hero Text
    gsap.from(".hero-content", {
        duration: 1.5,
        y: 50,
        opacity: 0,
        ease: "power3.out"
    });

    // Glass Cards Reveal
    gsap.utils.toArray('.glass-card').forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        });
    });

    // Project Cards Stagger
    gsap.from(".project-card", {
        scrollTrigger: {
            trigger: "#projects",
            start: "top 70%"
        },
        y: 100,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8
    });
});
