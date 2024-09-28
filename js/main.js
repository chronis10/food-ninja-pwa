let score;
let lives;
let foodItems = [];
let isSlicing = false;
let userId = '';
let fruitVelocity;
let maxFruits;
let gravity;
let previousTouchPosition = null;
let life_up;

// Set up the scene, camera, and renderer for 3D game canvas
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Main 3D game canvas and renderer
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// Separate 2D canvas for slice traces
const sliceCanvas = document.getElementById('slice-canvas');
const sliceCtx = sliceCanvas.getContext("2d");

// Ensure both canvases resize correctly
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    sliceCanvas.width = window.innerWidth;
    sliceCanvas.height = window.innerHeight;
}
window.addEventListener('resize', onWindowResize);
onWindowResize();  // Initial setup

// Prevent default behavior only on the slice canvas
sliceCanvas.addEventListener('touchstart', preventDefault);
sliceCanvas.addEventListener('touchmove', preventDefault);
sliceCanvas.addEventListener('touchend', preventDefault);

function preventDefault(e) {
    e.preventDefault();  // Prevent scrolling on the canvas only
}

// Game Initialization Logic
window.onload = function () {
    const storedId = localStorage.getItem('userId');
    if (storedId) {
        userId = storedId;
        document.getElementById('user-id-section').classList.add('hidden');
        document.getElementById('start-button').classList.remove('hidden');
    }
};

// Event Listeners for Game Start
document.getElementById('submit-id-button').addEventListener('click', () => {
    userId = document.getElementById('user-id-input').value;
    if (userId) {
        localStorage.setItem('userId', userId);
        startGame();
    }
});

document.getElementById('start-button').addEventListener('click', () => {
    startGame();
});

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // Initialize the game state
    score = 0;
    lives = 3;  // Start with 3 lives
    fruitVelocity = 0.05;
    maxFruits = 3;
    gravity = -0.002;
    foodItems = [];
    life_up = 10;  // Number of points needed to earn an extra life
    updateLives();
    document.getElementById('score').innerText = score;

    gameLoop();
}

function gameLoop() {
    setInterval(() => {
        if (foodItems.length < maxFruits) {
            createFood();
        }
    }, 1200);
    animate();
}

// Mouse and Touch Slice Detection
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

sliceCanvas.addEventListener('mousedown', startSlice);
sliceCanvas.addEventListener('touchstart', startSlice);
sliceCanvas.addEventListener('mouseup', endSlice);
sliceCanvas.addEventListener('touchend', endSlice);
sliceCanvas.addEventListener('mousemove', handleSlice);
sliceCanvas.addEventListener('touchmove', handleSlice);

function startSlice(event) {
    isSlicing = true;
    previousTouchPosition = getTouchPosition(event);
}

function endSlice() {
    isSlicing = false;
    previousTouchPosition = null;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
}

function handleSlice(event) {
    if (!isSlicing) return;

    const touchPosition = getTouchPosition(event);
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((touchPosition.x - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touchPosition.y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(foodItems);
    if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
            sliceFood(intersects[i].object);
        }
    }

    drawSliceTrace(previousTouchPosition, touchPosition);
    previousTouchPosition = touchPosition;
}

function getTouchPosition(event) {
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else {
        return { x: event.clientX, y: event.clientY };
    }
}

function drawSliceTrace(start, end) {
    if (!start || !end) return;
    sliceCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    sliceCtx.lineWidth = 5;
    sliceCtx.beginPath();
    sliceCtx.moveTo(start.x, start.y);
    sliceCtx.lineTo(end.x, end.y);
    sliceCtx.stroke();
}

// Load textures for food items
const foodTextures = [
    new THREE.TextureLoader().load('assets/apple.png'),
    new THREE.TextureLoader().load('assets/burger.png'),
    new THREE.TextureLoader().load('assets/egg.png')
];

// Create and add food to the scene
function createFood() {
    const texture = foodTextures[Math.floor(Math.random() * foodTextures.length)];
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const food = new THREE.Mesh(geometry, material);

    food.sliced = false;
    const startX = Math.random() * 2 - 1;
    const startY = -4;
    const initialVerticalVelocity = Math.random() * 0.1 + 0.1;
    let horizontalVelocity = (Math.random() - 0.5) * 0.05;

    food.position.set(startX, startY, 0);
    scene.add(food);
    foodItems.push(food);

    let velocityY = initialVerticalVelocity;

    animateFruit();  // Start animating the fruit

    function animateFruit() {
        velocityY += gravity;
        food.position.y += velocityY;
        food.position.x += horizontalVelocity;

        const radius = 0.25;

        // Bounce effect when hitting canvas boundaries
        if (food.position.x - radius < -2 || food.position.x + radius > 2) {
            horizontalVelocity = (food.position.x > 0) ? -0.02 : 0.02;  // Adjust velocity towards center
        }

        if (food.position.y + radius > 5.5) {
            velocityY = -Math.abs(velocityY);
        }

        if (food.position.y - radius < -5) {
            scene.remove(food);
            foodItems = foodItems.filter(f => f !== food);
            if (!food.sliced) {
                loseLife();
            }
        } else {
            requestAnimationFrame(animateFruit);
        }
    }
}

function sliceFood(food) {
    scene.remove(food);
    food.sliced = true;
    foodItems = foodItems.filter(f => f !== food);
    score++;
    document.getElementById('score').innerText = score;

    // Increase life when score is a multiple of `life_up`, with a maximum of 4 lives
    if (score % life_up === 0 && lives < 4) {
        lives++;
        updateLives();
    }
}

function loseLife() {
    lives--;
    updateLives();
    if (lives <= 0) {
        endGame();
    }
}

// Update the life display to show up to 4 hearts
function updateLives() {
    for (let i = 1; i <= 4; i++) {  // Now handle 4 lives instead of 3
        let lifeElement = document.getElementById(`life-${i}`);

        // Create the 4th life element if it doesn't exist
        if (!lifeElement && i === 4) {
            lifeElement = document.createElement('img');
            lifeElement.src = 'assets/heart.png';
            lifeElement.classList.add('life');
            lifeElement.id = `life-${i}`;
            document.getElementById('life-counter').appendChild(lifeElement);
        }

        lifeElement.style.visibility = i > lives ? 'hidden' : 'visible';
    }
}

function endGame() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    localStorage.setItem(`${userId}-score`, score);
}

document.getElementById('restart-button').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    startGame();
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
