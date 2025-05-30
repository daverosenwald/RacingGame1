// Get the canvas and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let score = 0;
let highScore = 0;
let nuggetCount = 0;
let fingerCount = 0;
let animationId;
let lastTimestamp = 0;
let lastObstacleSpawn = 0;
let lastCollectibleSpawn = 0;
let gameTimer = 0;
let lastSpeedIncrease = 0;
let scoreMultiplier = 1;
const FPS = 60;
const frameTime = 1000 / FPS;
const obstacleSpawnRate = 1500; // Spawn a new obstacle every 1.5 seconds
const collectibleSpawnRate = 2000; // Spawn collectibles every 2 seconds
let gameActive = false; // Track if the game is active (false by default)
let speedScaleFactor = 1; // Global speed scaling factor
let isMuted = false;
let waveOffset = 0; // For water animation

// Water properties
const water = {
    waveHeight: 5,
    waveWidth: 30,
    waveSpeed: 2,
    waveRows: 20,
    waves: [],
    init: function() {
        // Initialize waves
        this.waves = [];
        const rowHeight = canvas.height / this.waveRows;
        
        for (let row = 0; row < this.waveRows; row++) {
            const y = row * rowHeight;
            const offset = Math.random() * this.waveWidth; // Random offset for each row
            this.waves.push({
                y: y,
                offset: offset
            });
        }
    }
};

// Player boat properties
const player = {
    width: 40,
    height: 60,
    x: canvas.width / 2 - 20, // Center the boat horizontally
    y: canvas.height - 100,   // Position near the bottom
    baseSpeed: 5,             // Base movement speed
    currentSpeed: 5,          // Current movement speed
    maxSpeed: 10,             // Maximum movement speed
    minSpeed: 2,              // Minimum movement speed
    speedIncrement: 0.2,      // How much speed changes per key press
    color: '#8B4513',         // Brown for wooden boat
    boostActive: false,       // Speed boost state
    boostEndTime: 0,          // When the speed boost ends
    boostDuration: 3000,      // Speed boost duration in ms
    boostMultiplier: 1.5      // Speed boost multiplier
};

// Obstacle types
const obstacleTypes = [
    {
        name: 'log',
        width: 80,
        height: 30,
        speedRange: [2.5, 4],
        colorRange: ['#8B4513', '#A0522D', '#CD853F'], // Brown variations for logs
        points: 1
    },
    {
        name: 'barrel',
        width: 40,
        height: 40,
        speedRange: [3, 4.5],
        colorRange: ['#B22222', '#8B0000', '#CD5C5C'], // Red variations for barrels
        points: 2
    },
    {
        name: 'rock',
        width: 50,
        height: 50,
        speedRange: [1.5, 3],
        colorRange: ['#696969', '#808080', '#A9A9A9'], // Gray variations for rocks
        points: 3
    }
];

// Collectible types
const collectibleTypes = [
    {
        name: 'nugget',
        width: 20,
        height: 20,
        speedRange: [2, 3.5],
        color: '#FFCC44', // Golden yellow for nuggets
        points: 10,
        type: 'nugget'
    },
    {
        name: 'finger',
        width: 30,
        height: 15,
        speedRange: [2, 3],
        color: '#FFAA00', // Orange for fingers
        points: 25,
        type: 'finger'
    }
];

// Obstacles array
const obstacles = [];

// Collectibles array
const collectibles = [];

// Controls state
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    s: false,
    W: false,
    S: false
};

// Audio elements
const backgroundMusic = document.getElementById('background-music');
const crashSound = document.getElementById('crash-sound');
const collectSound = document.getElementById('collect-sound');

// UI elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const highScoreElement = document.getElementById('high-score');
const startHighScoreElement = document.getElementById('start-high-score');
const gameOverHighScoreElement = document.getElementById('game-over-high-score');
const multiplierElement = document.getElementById('multiplier');
const nuggetCountElement = document.getElementById('nugget-count');
const fingerCountElement = document.getElementById('finger-count');
const finalNuggetCountElement = document.getElementById('final-nugget-count');
const finalFingerCountElement = document.getElementById('final-finger-count');
const muteButton = document.getElementById('mute-button');
const volumeIcon = document.getElementById('volume-icon');

// Audio functions
function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        backgroundMusic.pause();
        volumeIcon.className = 'fas fa-volume-mute';
    } else {
        if (gameActive) {
            backgroundMusic.play();
        }
        volumeIcon.className = 'fas fa-volume-up';
    }
}

function playBackgroundMusic() {
    if (!isMuted) {
        backgroundMusic.volume = 0.3;
        backgroundMusic.play();
    }
}

function playCrashSound() {
    if (!isMuted) {
        crashSound.volume = 0.5;
        crashSound.currentTime = 0;
        crashSound.play();
    }
}

function playCollectSound() {
    if (!isMuted) {
        collectSound.volume = 0.4;
        collectSound.currentTime = 0;
        collectSound.play();
    }
}

// High score functions
function loadHighScore() {
    const savedHighScore = localStorage.getItem('riverAdventureHighScore');
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore);
    }
    updateHighScoreDisplay();
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('riverAdventureHighScore', highScore);
    }
    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    highScoreElement.textContent = highScore;
    startHighScoreElement.textContent = highScore;
    gameOverHighScoreElement.textContent = highScore;
}

// Show a specific screen and hide others
function showScreen(screen) {
    // Hide all screens
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Show the requested screen
    if (screen === 'start') {
        startScreen.style.display = 'block';
    } else if (screen === 'gameOver') {
        gameOverScreen.style.display = 'block';
    } else if (screen === 'none') {
        // Hide all screens to show the game
    }
}

// Event listeners for keyboard controls
window.addEventListener('keydown', function(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        e.preventDefault(); // Prevent scrolling when arrow keys are pressed
    }
});

window.addEventListener('keyup', function(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Mute button event listener
muteButton.addEventListener('click', toggleMute);

// Check if speed boost is active and update accordingly
function updateSpeedBoost(currentTime) {
    if (player.boostActive && currentTime >= player.boostEndTime) {
        player.boostActive = false;
    }
}

// Get the effective player speed (considering boost)
function getPlayerEffectiveSpeed() {
    return player.boostActive ? player.currentSpeed * player.boostMultiplier : player.currentSpeed;
}

// Draw the water background with animated waves
function drawWater() {
    // Draw water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a7db5');
    gradient.addColorStop(1, '#115577');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw animated waves
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    
    // Calculate effective wave speed based on player speed
    const effectiveSpeed = getPlayerEffectiveSpeed();
    const relativeWaveSpeed = water.waveSpeed * (effectiveSpeed / player.baseSpeed) * speedScaleFactor;
    
    // Update wave offset for animation
    waveOffset += relativeWaveSpeed;
    if (waveOffset > water.waveWidth) {
        waveOffset = 0;
    }
    
    // Draw waves for each row
    water.waves.forEach(wave => {
        for (let x = -water.waveWidth; x < canvas.width + water.waveWidth; x += water.waveWidth) {
            const adjustedX = x + wave.offset + waveOffset;
            ctx.beginPath();
            ctx.moveTo(adjustedX, wave.y);
            ctx.bezierCurveTo(
                adjustedX + water.waveWidth / 4, wave.y - water.waveHeight,
                adjustedX + water.waveWidth * 3/4, wave.y - water.waveHeight,
                adjustedX + water.waveWidth, wave.y
            );
            ctx.lineTo(adjustedX + water.waveWidth, wave.y + 10);
            ctx.lineTo(adjustedX, wave.y + 10);
            ctx.closePath();
            ctx.fill();
        }
    });
}

// Update water wave positions
function updateWater() {
    // Already handled by waveOffset in drawWater
}

// Draw the player boat
function drawPlayer() {
    // Draw boat body (hull)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + player.height * 0.8);
    ctx.lineTo(player.x + player.width, player.y + player.height * 0.8);
    ctx.lineTo(player.x + player.width * 0.8, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.2, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw boat interior
    ctx.fillStyle = '#DEB887'; // Lighter brown
    ctx.beginPath();
    ctx.moveTo(player.x + player.width * 0.1, player.y + player.height * 0.8);
    ctx.lineTo(player.x + player.width * 0.9, player.y + player.height * 0.8);
    ctx.lineTo(player.x + player.width * 0.75, player.y + player.height * 0.95);
    ctx.lineTo(player.x + player.width * 0.25, player.y + player.height * 0.95);
    ctx.closePath();
    ctx.fill();
    
    // Draw oars
    ctx.fillStyle = '#A0522D'; // Medium brown
    
    // Left oar
    ctx.fillRect(player.x - 5, player.y + player.height * 0.6, 5, player.height * 0.3);
    
    // Right oar
    ctx.fillRect(player.x + player.width, player.y + player.height * 0.6, 5, player.height * 0.3);
    
    // Draw person in boat (simple)
    ctx.fillStyle = '#FF6347'; // Tomato color for shirt
    ctx.fillRect(player.x + player.width * 0.3, player.y + player.height * 0.4, player.width * 0.4, player.height * 0.3);
    
    // Head
    ctx.fillStyle = '#FFA07A'; // Light salmon for skin
    ctx.beginPath();
    ctx.arc(player.x + player.width * 0.5, player.y + player.height * 0.3, player.width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw speed boost effect if active
    if (player.boostActive) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Gold with transparency
        ctx.beginPath();
        ctx.ellipse(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width * 1.2,
            player.height * 1.2,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Add some motion lines behind the boat
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const offset = i * 10;
            ctx.beginPath();
            ctx.moveTo(player.x + player.width * 0.2, player.y + player.height + offset);
            ctx.lineTo(player.x - player.width * 0.5, player.y + player.height + offset + 15);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(player.x + player.width * 0.8, player.y + player.height + offset);
            ctx.lineTo(player.x + player.width * 1.5, player.y + player.height + offset + 15);
            ctx.stroke();
        }
    }
}

// Create a new obstacle
function spawnObstacle() {
    // Randomly select an obstacle type
    const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
    const type = obstacleTypes[typeIndex];
    
    // Random color from the type's color range
    const colorIndex = Math.floor(Math.random() * type.colorRange.length);
    const color = type.colorRange[colorIndex];
    
    // Random speed within the type's speed range, affected by the global speed scale
    const baseSpeed = type.speedRange[0] + Math.random() * (type.speedRange[1] - type.speedRange[0]);
    const speed = baseSpeed * speedScaleFactor;
    
    // Random X position within canvas bounds
    const x = Math.random() * (canvas.width - type.width);
    
    const obstacle = {
        x: x,
        y: -type.height, // Start above the canvas
        width: type.width,
        height: type.height,
        speed: speed,
        color: color,
        type: type.name,
        points: type.points
    };
    
    obstacles.push(obstacle);
}

// Create a new collectible
function spawnCollectible() {
    // Randomly select a collectible type
    const typeIndex = Math.floor(Math.random() * collectibleTypes.length);
    const type = collectibleTypes[typeIndex];
    
    // Random speed within the type's speed range, affected by the global speed scale
    const baseSpeed = type.speedRange[0] + Math.random() * (type.speedRange[1] - type.speedRange[0]);
    const speed = baseSpeed * speedScaleFactor;
    
    // Random X position within canvas bounds
    const x = Math.random() * (canvas.width - type.width);
    
    const collectible = {
        x: x,
        y: -type.height, // Start above the canvas
        width: type.width,
        height: type.height,
        speed: speed,
        color: type.color,
        type: type.type,
        points: type.points,
        collected: false
    };
    
    collectibles.push(collectible);
}

// Draw all obstacles
function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'log') {
            // Draw log
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add wood grain details
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y + obstacle.height * (i/4));
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * (i/4));
                ctx.stroke();
            }
        } else if (obstacle.type === 'barrel') {
            // Draw barrel
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add barrel rings
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height * 0.33);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.33);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height * 0.66);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.66);
            ctx.stroke();
        } else if (obstacle.type === 'rock') {
            // Draw rock (irregular shape)
            ctx.fillStyle = obstacle.color;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width * 0.5, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.4);
            ctx.lineTo(obstacle.x + obstacle.width * 0.8, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width * 0.2, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x, obstacle.y + obstacle.height * 0.3);
            ctx.closePath();
            ctx.fill();
            
            // Add rock texture
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.3);
            ctx.lineTo(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width * 0.6, obstacle.y + obstacle.height * 0.2);
            ctx.lineTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.6);
            ctx.stroke();
        }
    });
}

// Draw all collectibles
function drawCollectibles() {
    collectibles.forEach(collectible => {
        if (collectible.type === 'nugget') {
            // Draw chicken nugget (rounded rectangle)
            ctx.fillStyle = collectible.color;
            ctx.beginPath();
            const radius = collectible.height / 4;
            ctx.moveTo(collectible.x + radius, collectible.y);
            ctx.lineTo(collectible.x + collectible.width - radius, collectible.y);
            ctx.quadraticCurveTo(collectible.x + collectible.width, collectible.y, collectible.x + collectible.width, collectible.y + radius);
            ctx.lineTo(collectible.x + collectible.width, collectible.y + collectible.height - radius);
            ctx.quadraticCurveTo(collectible.x + collectible.width, collectible.y + collectible.height, collectible.x + collectible.width - radius, collectible.y + collectible.height);
            ctx.lineTo(collectible.x + radius, collectible.y + collectible.height);
            ctx.quadraticCurveTo(collectible.x, collectible.y + collectible.height, collectible.x, collectible.y + collectible.height - radius);
            ctx.lineTo(collectible.x, collectible.y + radius);
            ctx.quadraticCurveTo(collectible.x, collectible.y, collectible.x + radius, collectible.y);
            ctx.closePath();
            ctx.fill();
            
            // Add "breading" texture
            ctx.fillStyle = '#FFDD66';
            ctx.beginPath();
            ctx.arc(collectible.x + collectible.width * 0.3, collectible.y + collectible.height * 0.3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(collectible.x + collectible.width * 0.7, collectible.y + collectible.height * 0.6, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (collectible.type === 'finger') {
            // Draw chicken finger (elongated rounded rectangle)
            ctx.fillStyle = collectible.color;
            ctx.beginPath();
            const radius = collectible.height / 2;
            ctx.moveTo(collectible.x + radius, collectible.y);
            ctx.lineTo(collectible.x + collectible.width - radius, collectible.y);
            ctx.quadraticCurveTo(collectible.x + collectible.width, collectible.y, collectible.x + collectible.width, collectible.y + radius);
            ctx.lineTo(collectible.x + collectible.width, collectible.y + collectible.height - radius);
            ctx.quadraticCurveTo(collectible.x + collectible.width, collectible.y + collectible.height, collectible.x + collectible.width - radius, collectible.y + collectible.height);
            ctx.lineTo(collectible.x + radius, collectible.y + collectible.height);
            ctx.quadraticCurveTo(collectible.x, collectible.y + collectible.height, collectible.x, collectible.y + collectible.height - radius);
            ctx.lineTo(collectible.x, collectible.y + radius);
            ctx.quadraticCurveTo(collectible.x, collectible.y, collectible.x + radius, collectible.y);
            ctx.closePath();
            ctx.fill();
            
            // Add "breading" texture
            ctx.fillStyle = '#FFDD66';
            ctx.beginPath();
            ctx.arc(collectible.x + collectible.width * 0.2, collectible.y + collectible.height * 0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(collectible.x + collectible.width * 0.5, collectible.y + collectible.height * 0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(collectible.x + collectible.width * 0.8, collectible.y + collectible.height * 0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add a glow effect for fingers (speed boost indicator)
            ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'; // Gold with transparency
            ctx.beginPath();
            ctx.ellipse(
                collectible.x + collectible.width / 2,
                collectible.y + collectible.height / 2,
                collectible.width * 1.5,
                collectible.height * 1.5,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }
    });
}

// Move all obstacles down the screen
function moveObstacles() {
    const effectiveSpeed = getPlayerEffectiveSpeed();
    const speedRatio = effectiveSpeed / player.baseSpeed;
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        // Adjust obstacle speed based on player speed
        const relativeSpeed = obstacles[i].speed * speedRatio;
        obstacles[i].y += relativeSpeed;
        
        // Remove obstacles that have gone off screen
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }
}

// Move all collectibles down the screen
function moveCollectibles() {
    const effectiveSpeed = getPlayerEffectiveSpeed();
    const speedRatio = effectiveSpeed / player.baseSpeed;
    
    for (let i = collectibles.length - 1; i >= 0; i--) {
        // Adjust collectible speed based on player speed
        const relativeSpeed = collectibles[i].speed * speedRatio;
        collectibles[i].y += relativeSpeed;
        
        // Remove collectibles that have gone off screen or been collected
        if (collectibles[i].y > canvas.height || collectibles[i].collected) {
            collectibles.splice(i, 1);
        }
    }
}

// Update player position and speed based on key presses
function updatePlayerPosition() {
    if (!gameActive) return; // Don't update if game is over
    
    // Horizontal movement
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.currentSpeed;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width) {
        player.x += player.currentSpeed;
    }
    
    // Vertical movement
    if ((keys.ArrowUp || keys.w || keys.W) && player.y > 0) {
        player.y -= player.currentSpeed;
        
        // Increase speed when moving up (rowing harder)
        if (player.currentSpeed < player.maxSpeed) {
            player.currentSpeed += player.speedIncrement;
        }
    }
    if ((keys.ArrowDown || keys.s || keys.S) && player.y < canvas.height - player.height) {
        player.y += player.currentSpeed;
        
        // Decrease speed when moving down (slowing down)
        if (player.currentSpeed > player.minSpeed) {
            player.currentSpeed -= player.speedIncrement;
        }
    }
    
    // Ensure player stays within canvas bounds
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
}

// Activate speed boost
function activateSpeedBoost(timestamp) {
    player.boostActive = true;
    player.boostEndTime = timestamp + player.boostDuration;
}

// Check for collectible collection
function checkCollection(timestamp) {
    if (!gameActive) return;
    
    for (let i = 0; i < collectibles.length; i++) {
        const collectible = collectibles[i];
        
        // Skip if already collected
        if (collectible.collected) continue;
        
        // Check for collision using simple box collision detection
        if (
            player.x < collectible.x + collectible.width &&
            player.x + player.width > collectible.x &&
            player.y < collectible.y + collectible.height &&
            player.y + player.height > collectible.y
        ) {
            // Collectible collected
            collectible.collected = true;
            
            // Add points based on collectible type
            score += collectible.points;
            
            // Update nugget/finger counts and apply effects
            if (collectible.type === 'nugget') {
                nuggetCount++;
                nuggetCountElement.textContent = nuggetCount;
            } else if (collectible.type === 'finger') {
                fingerCount++;
                fingerCountElement.textContent = fingerCount;
                
                // Activate speed boost for fingers
                activateSpeedBoost(timestamp);
            }
            
            // Play collect sound
            playCollectSound();
            
            // Update score display
            document.getElementById('score').textContent = score;
        }
    }
}

// Update score
function updateScore(deltaTime) {
    if (!gameActive) return; // Don't update if game is over
    
    // Increase score based on time (points per second) with multiplier
    const points = Math.floor((deltaTime / 100) * scoreMultiplier);
    score += points;
    document.getElementById('score').textContent = score;
    
    // Update multiplier display
    multiplierElement.textContent = `x${scoreMultiplier.toFixed(1)}`;
}

// Update game difficulty based on time
function updateDifficulty(deltaTime) {
    if (!gameActive) return;
    
    // Update game timer
    gameTimer += deltaTime;
    
    // Increase speed every 10 seconds
    if (gameTimer - lastSpeedIncrease >= 10000) {
        speedScaleFactor += 0.1;
        lastSpeedIncrease = gameTimer;
        
        // Also increase score multiplier
        scoreMultiplier += 0.2;
        
        // Update obstacle speeds
        obstacles.forEach(obstacle => {
            const type = obstacleTypes.find(t => t.name === obstacle.type);
            const baseSpeed = type.speedRange[0] + Math.random() * (type.speedRange[1] - type.speedRange[0]);
            obstacle.speed = baseSpeed * speedScaleFactor;
        });
        
        // Update collectible speeds
        collectibles.forEach(collectible => {
            const type = collectibleTypes.find(t => t.type === collectible.type);
            const baseSpeed = type.speedRange[0] + Math.random() * (type.speedRange[1] - type.speedRange[0]);
            collectible.speed = baseSpeed * speedScaleFactor;
        });
    }
}

// Check for collisions between player and obstacles
function checkCollisions() {
    if (!gameActive) return false;
    
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        
        // Check for collision using simple box collision detection
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            // Collision detected
            gameOver();
            return true;
        }
    }
    
    return false;
}

// Game over function
function gameOver() {
    gameActive = false;
    
    // Play crash sound
    playCrashSound();
    
    // Stop background music
    backgroundMusic.pause();
    
    // Update high score if needed
    updateHighScore();
    
    // Update final score display
    finalScoreElement.textContent = score;
    
    // Update final nugget and finger counts
    finalNuggetCountElement.textContent = nuggetCount;
    finalFingerCountElement.textContent = fingerCount;
    
    // Show game over screen
    showScreen('gameOver');
    
    // Stop the animation loop
    cancelAnimationFrame(animationId);
}

// Clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Game loop
function gameLoop(timestamp) {
    // Calculate time since last frame
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    
    // Only update if enough time has passed for our target FPS
    if (deltaTime >= frameTime) {
        // Update game state
        clearCanvas();
        
        // Check if speed boost should end
        updateSpeedBoost(timestamp);
        
        // Update difficulty based on time
        updateDifficulty(deltaTime);
        
        // Update and draw water first (background)
        updateWater();
        drawWater();
        
        updatePlayerPosition();
        
        // Spawn obstacles at regular intervals
        if (gameActive && timestamp - lastObstacleSpawn > obstacleSpawnRate) {
            spawnObstacle();
            lastObstacleSpawn = timestamp;
        }
        
        // Spawn collectibles at regular intervals
        if (gameActive && timestamp - lastCollectibleSpawn > collectibleSpawnRate) {
            spawnCollectible();
            lastCollectibleSpawn = timestamp;
        }
        
        // Move and draw obstacles and collectibles
        moveObstacles();
        moveCollectibles();
        drawObstacles();
        drawCollectibles();
        
        // Check for collectible collection
        checkCollection(timestamp);
        
        updateScore(deltaTime);
        drawPlayer();
        checkCollisions();
        
        // Update last timestamp
        lastTimestamp = timestamp;
    }
    
    // Request next frame
    animationId = requestAnimationFrame(gameLoop);
}

// Start the game
function startGame() {
    // Hide all menu screens
    showScreen('none');
    
    // Reset game state
    score = 0;
    nuggetCount = 0;
    fingerCount = 0;
    gameActive = true;
    gameTimer = 0;
    lastSpeedIncrease = 0;
    speedScaleFactor = 1;
    scoreMultiplier = 1;
    obstacles.length = 0; // Clear any existing obstacles
    collectibles.length = 0; // Clear any existing collectibles
    
    // Reset player properties
    player.currentSpeed = player.baseSpeed;
    player.boostActive = false;
    player.boostEndTime = 0;
    
    // Update UI
    document.getElementById('score').textContent = score;
    nuggetCountElement.textContent = nuggetCount;
    fingerCountElement.textContent = fingerCount;
    multiplierElement.textContent = `x${scoreMultiplier.toFixed(1)}`;
    
    // Reset player position
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 100;
    
    // Initialize water
    water.init();
    
    // Play background music
    playBackgroundMusic();
    
    // Start the game loop
    lastTimestamp = 0;
    lastObstacleSpawn = 0;
    lastCollectibleSpawn = 0;
    animationId = requestAnimationFrame(gameLoop);
}

// Initialize the game when the page loads
window.onload = function() {
    // Load high score from localStorage
    loadHighScore();
    
    // Initialize the water
    water.init();
    
    // Draw initial water and player (static preview)
    drawWater();
    drawPlayer();
    
    // Show start screen
    showScreen('start');
    
    // Add event listeners for buttons
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
};
