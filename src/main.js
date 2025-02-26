import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { World } from './world.js';
import { Player } from './player.js';

// Game variables
let scene, camera, renderer;
let world, player;
let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

// Physics variables
const gravity = 7.0;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let physicsEnabled = false;
let startTime = 0;

// Add these variables at the top with other variables
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 0;
let debugMode = false;
let debugMarkers = [];

init();
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Create world
    world = new World(scene);
    world.generateProceduralTerrain();

    // Create player with reference to world
    player = new Player(camera, world);

    // Setup controls
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // Click to start controls
    document.addEventListener('click', function() {
        controls.lock();
    });

    controls.addEventListener('lock', function() {
        document.getElementById('info').style.display = 'block';
    });

    controls.addEventListener('unlock', function() {
        document.getElementById('info').style.display = 'none';
    });

    // Setup keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Find a suitable spawn position
    function findSpawnPosition() {
        // Start at origin
        let spawnX = 0;
        let spawnZ = 0;
        let spawnY = 1.5; // Default height above ground
        
        // Use the flat spawn area we created
        return { x: spawnX, y: spawnY, z: spawnZ };
    }

    // Set player position to spawn point and reset velocity
    const spawnPos = findSpawnPosition();
    camera.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    velocity.set(0, 0, 0); // Reset velocity to prevent initial fall
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y = 7.0; // Slightly lower jump force
                canJump = false;
            }
            break;
        case 'KeyF':
            debugMode = !debugMode;
            // Clear existing debug markers when toggling off
            if (!debugMode) {
                debugMarkers.forEach(marker => scene.remove(marker));
                debugMarkers = [];
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    
    // Calculate FPS
    frameCount++;
    if (time > lastFpsUpdate + 1000) {
        fps = Math.round((frameCount * 1000) / (time - lastFpsUpdate));
        lastFpsUpdate = time;
        frameCount = 0;
        document.getElementById('fps').textContent = `FPS: ${fps}`;
    }
    
    // Enable physics after a short delay
    if (!physicsEnabled) {
        if (startTime === 0) {
            startTime = time;
        } else if (time - startTime > 500) { // 500ms delay
            physicsEnabled = true;
        }
    }
    
    if (controls.isLocked) {
        const delta = (time - prevTime) / 1000;

        // Only apply physics if enabled
        if (physicsEnabled) {
            // Apply gravity
            velocity.y -= gravity * delta;

            // Reset velocity before calculating new movement
            velocity.x = 0;
            velocity.z = 0;
            
            // Get camera direction vectors
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            // We only care about horizontal movement, so zero out the Y component
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            // Calculate right vector (perpendicular to camera direction)
            const rightVector = new THREE.Vector3();
            rightVector.crossVectors(camera.up, cameraDirection).normalize();
            
            // Calculate movement based on key presses
            const speed = 5.0;
            
            // Forward/backward movement along camera direction
            if (moveForward) {
                velocity.add(cameraDirection.clone().multiplyScalar(speed));
            }
            if (moveBackward) {
                velocity.add(cameraDirection.clone().multiplyScalar(-speed));
            }
            
            // Left/right movement perpendicular to camera direction
            if (moveLeft) {
                velocity.add(rightVector.clone().multiplyScalar(speed));
            }
            if (moveRight) {
                velocity.add(rightVector.clone().multiplyScalar(-speed));
            }
            
            // Add damping to make movement smoother
            const damping = 0.9;
            velocity.x *= damping;
            velocity.z *= damping;
            
            // Set minimum velocity threshold to prevent tiny movements
            const minVelocity = 0.01;
            if (Math.abs(velocity.x) < minVelocity) velocity.x = 0;
            if (Math.abs(velocity.z) < minVelocity) velocity.z = 0;
            
            // Improved collision detection
            const playerPos = controls.getObject().position;
            const playerRadius = 0.3;
            const playerHeight = 1.8;
            
            // Store original position to revert if collision occurs
            const originalX = playerPos.x;
            const originalZ = playerPos.z;
            
            // Calculate next position based on velocity
            const nextX = originalX + velocity.x * delta;
            const nextZ = originalZ + velocity.z * delta;
            
            // Try moving on X axis first
            playerPos.x = nextX;
            if (checkCollision(playerPos, playerRadius, playerHeight)) {
                // Collision occurred, revert position
                playerPos.x = originalX;
            }
            
            // Then try moving on Z axis
            playerPos.z = nextZ;
            if (checkCollision(playerPos, playerRadius, playerHeight)) {
                // Collision occurred, revert position
                playerPos.z = originalZ;
            }
            
            // Vertical movement and collision
            const originalY = playerPos.y;
            const nextY = originalY + velocity.y * delta;
            
            // Check if we're going to hit the ground
            playerPos.y = nextY;
            
            // Check for ground or ceiling collision
            if (velocity.y < 0) {
                // We're falling, check for ground
                if (checkGroundCollision(playerPos, playerRadius)) {
                    // Find the exact ground height
                    const groundHeight = findGroundHeight(playerPos, playerRadius);
                    playerPos.y = groundHeight + 1.5; // Position player exactly on ground
                    velocity.y = 0;
                    canJump = true;
                }
            } else if (velocity.y > 0) {
                // We're jumping/rising, check for ceiling
                if (checkCeilingCollision(playerPos, playerRadius, playerHeight)) {
                    // Hit ceiling, stop upward movement
                    playerPos.y = originalY;
                    velocity.y = 0;
                }
            }
            
            // Set a minimum height to prevent falling forever
            if (playerPos.y < -50) {
                velocity.y = 0;
                playerPos.y = 10;
                playerPos.x = 0;
                playerPos.z = 0;
            }
        }
        
        // Update position display regardless of physics
        const position = controls.getObject().position;
        document.getElementById('position').textContent = 
            `X: ${Math.round(position.x)}, Y: ${Math.round(position.y)}, Z: ${Math.round(position.z)}`;

        // Debug visualization
        if (debugMode) {
            updateDebugVisualization(position);
        }

        if (physicsEnabled && world.updateChunks) {
            world.updateChunks(position.x, position.z);
        }

        prevTime = time;
    }
    
    renderer.render(scene, camera);
}

// New helper functions for collision detection
function checkCollision(position, radius, height) {
    // Check a cylinder around the player for collisions
    const checkPoints = [];
    const numAngles = 8; // Check 8 points around the player
    
    // Check at different heights: feet, middle, head
    const heights = [0.1, 0.9, 1.7];
    
    for (const h of heights) {
        for (let i = 0; i < numAngles; i++) {
            const angle = (i / numAngles) * Math.PI * 2;
            const x = position.x + Math.cos(angle) * radius;
            const z = position.z + Math.sin(angle) * radius;
            const y = position.y - 0.5 + h; // Adjust for player height
            
            checkPoints.push({x, y, z});
        }
    }
    
    // Also check the center of the player
    for (const h of heights) {
        checkPoints.push({
            x: position.x,
            y: position.y - 0.5 + h,
            z: position.z
        });
    }
    
    // Check if any point collides with a block
    for (const point of checkPoints) {
        const blockX = Math.floor(point.x);
        const blockY = Math.floor(point.y);
        const blockZ = Math.floor(point.z);
        
        const blockKey = `${blockX},${blockY},${blockZ}`;
        if (world.blocks.has(blockKey)) {
            return true; // Collision detected
        }
    }
    
    return false; // No collision
}

function checkGroundCollision(position, radius) {
    // Check points below the player
    const checkPoints = [];
    const numAngles = 8;
    
    // Check the center and around the player's feet
    for (let i = 0; i < numAngles; i++) {
        const angle = (i / numAngles) * Math.PI * 2;
        const x = position.x + Math.cos(angle) * radius;
        const z = position.z + Math.sin(angle) * radius;
        const y = position.y - 0.6; // Just below feet
        
        checkPoints.push({x, y, z});
    }
    
    // Also check center point
    checkPoints.push({
        x: position.x,
        y: position.y - 0.6,
        z: position.z
    });
    
    // Check if any point collides with a block
    for (const point of checkPoints) {
        const blockX = Math.floor(point.x);
        const blockY = Math.floor(point.y);
        const blockZ = Math.floor(point.z);
        
        const blockKey = `${blockX},${blockY},${blockZ}`;
        if (world.blocks.has(blockKey)) {
            return true; // Ground collision detected
        }
    }
    
    return false; // No ground collision
}

function checkCeilingCollision(position, radius, height) {
    // Check points above the player's head
    const checkPoints = [];
    const numAngles = 8;
    
    // Check around the player's head
    for (let i = 0; i < numAngles; i++) {
        const angle = (i / numAngles) * Math.PI * 2;
        const x = position.x + Math.cos(angle) * radius;
        const z = position.z + Math.sin(angle) * radius;
        const y = position.y - 0.5 + height + 0.1; // Just above head
        
        checkPoints.push({x, y, z});
    }
    
    // Also check center point
    checkPoints.push({
        x: position.x,
        y: position.y - 0.5 + height + 0.1,
        z: position.z
    });
    
    // Check if any point collides with a block
    for (const point of checkPoints) {
        const blockX = Math.floor(point.x);
        const blockY = Math.floor(point.y);
        const blockZ = Math.floor(point.z);
        
        const blockKey = `${blockX},${blockY},${blockZ}`;
        if (world.blocks.has(blockKey)) {
            return true; // Ceiling collision detected
        }
    }
    
    return false; // No ceiling collision
}

function findGroundHeight(position, radius) {
    // Find the highest ground point under the player
    let highestY = -Infinity;
    const numAngles = 8;
    
    // Check the center and around the player's feet
    const checkPoints = [];
    for (let i = 0; i < numAngles; i++) {
        const angle = (i / numAngles) * Math.PI * 2;
        const x = position.x + Math.cos(angle) * radius;
        const z = position.z + Math.sin(angle) * radius;
        
        checkPoints.push({x, z});
    }
    
    // Also check center point
    checkPoints.push({
        x: position.x,
        z: position.z
    });
    
    // For each point, scan downward to find ground
    for (const point of checkPoints) {
        // Start from player's current position and scan down
        for (let y = Math.floor(position.y); y > Math.floor(position.y) - 10; y--) {
            const blockX = Math.floor(point.x);
            const blockY = y;
            const blockZ = Math.floor(point.z);
            
            const blockKey = `${blockX},${blockY},${blockZ}`;
            if (world.blocks.has(blockKey)) {
                if (y > highestY) {
                    highestY = y;
                }
                break; // Found ground for this point
            }
        }
    }
    
    return highestY;
}

function updateDebugVisualization(position) {
    // Clear previous markers
    debugMarkers.forEach(marker => scene.remove(marker));
    debugMarkers = [];
    
    // Create a marker for the player's collision cylinder
    const playerRadius = 0.3;
    const playerHeight = 1.8;
    
    // Create cylinder for player collision volume
    const cylinderGeometry = new THREE.CylinderGeometry(playerRadius, playerRadius, playerHeight, 16);
    const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinderMesh.position.copy(position);
    cylinderMesh.position.y -= 0.5; // Adjust to match player's feet
    scene.add(cylinderMesh);
    debugMarkers.push(cylinderMesh);
    
    // Visualize check points
    const pointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    // Create check points for collision visualization
    const numAngles = 8;
    const heights = [0.1, 0.9, 1.7];
    
    for (const h of heights) {
        for (let i = 0; i < numAngles; i++) {
            const angle = (i / numAngles) * Math.PI * 2;
            const x = position.x + Math.cos(angle) * playerRadius;
            const z = position.z + Math.sin(angle) * playerRadius;
            const y = position.y - 0.5 + h;
            
            const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
            pointMesh.position.set(x, y, z);
            scene.add(pointMesh);
            debugMarkers.push(pointMesh);
        }
    }
} 