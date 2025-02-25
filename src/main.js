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

            // Get movement direction
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            // Move player
            if (moveForward || moveBackward) velocity.z = -direction.z * 5.0;
            else velocity.z = 0;

            if (moveLeft || moveRight) velocity.x = -direction.x * 5.0;
            else velocity.x = 0;

            // Add damping to make movement smoother
            const damping = 0.9;
            velocity.x *= damping;
            velocity.z *= damping;

            // Set minimum velocity threshold to prevent tiny movements
            const minVelocity = 0.01;
            if (Math.abs(velocity.x) < minVelocity) velocity.x = 0;
            if (Math.abs(velocity.z) < minVelocity) velocity.z = 0;

            // Check for horizontal collisions with a more robust approach
            const playerRadius = 0.3;
            const playerHeight = 1.8;
            const playerPos = controls.getObject().position;
            const nextPosition = playerPos.clone();

            // Calculate next position based on velocity
            nextPosition.x += -velocity.x * delta;
            nextPosition.z += -velocity.z * delta;

            // Create a more detailed collision box around the player
            const checkPositions = [];
            const directions = [
                [1, 0], [-1, 0], [0, 1], [0, -1], // Cardinal directions
                [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7] // Diagonals
            ];

            // Check at multiple heights (feet, middle, head)
            const heights = [0, 0.9, 1.7]; 

            for (const height of heights) {
                for (const [dx, dz] of directions) {
                    const x = Math.floor(playerPos.x + dx * playerRadius);
                    const y = Math.floor(playerPos.y - 0.5 + height); // Adjust for player height
                    const z = Math.floor(playerPos.z + dz * playerRadius);
                    checkPositions.push([x, y, z]);
                }
            }

            let collisionX = false;
            let collisionZ = false;
            let collidingBlocks = [];

            // Check all positions for collisions
            for (const [x, y, z] of checkPositions) {
                const blockKey = `${x},${y},${z}`;
                if (world.blocks.has(blockKey)) {
                    collidingBlocks.push([x, y, z]);
                    
                    // Determine collision direction based on velocity
                    if (velocity.x !== 0) {
                        const blockX = x;
                        const playerX = Math.floor(playerPos.x);
                        
                        // Only count as collision if block is in the direction we're moving
                        if ((velocity.x > 0 && blockX > playerX) || 
                            (velocity.x < 0 && blockX < playerX)) {
                            collisionX = true;
                        }
                    }
                    
                    if (velocity.z !== 0) {
                        const blockZ = z;
                        const playerZ = Math.floor(playerPos.z);
                        
                        // Only count as collision if block is in the direction we're moving
                        if ((velocity.z > 0 && blockZ > playerZ) || 
                            (velocity.z < 0 && blockZ < playerZ)) {
                            collisionZ = true;
                        }
                    }
                }
            }

            // Completely disable stepping for trees and tall structures
            let canStep = false;

            // Only try stepping if we have a collision and are moving
            if ((collisionX || collisionZ) && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.z) > 0.1)) {
                // Get the lowest colliding block
                let lowestBlock = null;
                let lowestY = Infinity;
                
                for (const [x, y, z] of collidingBlocks) {
                    if (y < lowestY) {
                        lowestY = y;
                        lowestBlock = [x, y, z];
                    }
                }
                
                if (lowestBlock) {
                    const [x, y, z] = lowestBlock;
                    
                    // Only allow stepping if:
                    // 1. The block is at or below player's feet level
                    // 2. There's no block above it
                    // 3. The block is only one block high
                    
                    if (y <= Math.floor(playerPos.y - 0.4)) {
                        const blockAboveKey = `${x},${y+1},${z}`;
                        const blockAboveAboveKey = `${x},${y+2},${z}`;
                        
                        // Check if there's exactly one block (not a column/tree)
                        if (!world.blocks.has(blockAboveKey) && !world.blocks.has(blockAboveAboveKey)) {
                            // This is a valid step - only one block high
                            canStep = true;
                            
                            // Adjust player height to step up
                            const targetY = y + 1.5; // Position on top of the block
                            
                            // Only adjust if we need to step up (not down)
                            if (targetY > playerPos.y && targetY - playerPos.y < 0.6) {
                                controls.getObject().position.y = targetY;
                            }
                        }
                    }
                }
            }

            // Apply movement with collision detection
            if (!collisionX || canStep) {
                controls.moveRight(-velocity.x * delta);
            }
            if (!collisionZ || canStep) {
                controls.moveForward(-velocity.z * delta);
            }

            // Update vertical position with collision detection
            const nextY = controls.getObject().position.y + velocity.y * delta;

            // Check for ground collision - use a more stable approach
            let onGround = false;
            const feetY = Math.floor(playerPos.y - 0.5);

            // Use a small tolerance to prevent jittering
            const GROUND_TOLERANCE = 0.05;
            const EXACT_GROUND_HEIGHT = feetY + 1.5;

            // Check if there's a block directly below the player
            const groundKey = `${Math.floor(playerPos.x)},${feetY},${Math.floor(playerPos.z)}`;

            if (world.blocks.has(groundKey)) {
                // Only adjust position if we're not already very close to the exact height
                if (Math.abs(playerPos.y - EXACT_GROUND_HEIGHT) > GROUND_TOLERANCE) {
                    controls.getObject().position.y = EXACT_GROUND_HEIGHT;
                }
                
                // Always stop falling and enable jumping when on ground
                if (velocity.y <= 0) {
                    velocity.y = 0;
                    canJump = true;
                    onGround = true;
                }
            } else {
                // Check surrounding blocks for ground collision (for edge cases)
                const checkRadius = 0.3;
                const surroundingPositions = [
                    [Math.floor(playerPos.x + checkRadius), feetY, Math.floor(playerPos.z)],
                    [Math.floor(playerPos.x - checkRadius), feetY, Math.floor(playerPos.z)],
                    [Math.floor(playerPos.x), feetY, Math.floor(playerPos.z + checkRadius)],
                    [Math.floor(playerPos.x), feetY, Math.floor(playerPos.z - checkRadius)]
                ];

                for (const [x, y, z] of surroundingPositions) {
                    const key = `${x},${y},${z}`;
                    if (world.blocks.has(key) && velocity.y <= 0) {
                        // Only adjust position if we're not already very close to the exact height
                        if (Math.abs(playerPos.y - EXACT_GROUND_HEIGHT) > GROUND_TOLERANCE) {
                            controls.getObject().position.y = EXACT_GROUND_HEIGHT;
                        }
                        
                        velocity.y = 0;
                        canJump = true;
                        onGround = true;
                        break;
                    }
                }
            }

            // Check for ceiling collision
            const headY = Math.floor(playerPos.y + 1.0); // Position of player's head
            const ceilingKey = `${Math.floor(playerPos.x)},${headY},${Math.floor(playerPos.z)}`;

            if (world.blocks.has(ceilingKey) && velocity.y > 0) {
                velocity.y = 0;
            }

            // If not on ground and not hitting ceiling, apply gravity and update position
            if (!onGround) {
                controls.getObject().position.y = nextY;
            }

            // Set a minimum height to prevent falling forever
            if (controls.getObject().position.y < -50) {
                velocity.y = 0;
                controls.getObject().position.y = 10;
                controls.getObject().position.x = 0;
                controls.getObject().position.z = 0;
            }
        }
        
        // Update position display regardless of physics
        const position = controls.getObject().position;
        document.getElementById('position').textContent = 
            `X: ${Math.round(position.x)}, Y: ${Math.round(position.y)}, Z: ${Math.round(position.z)}`;

        // Visualize collisions in debug mode
        if (debugMode) {
            // Clear previous markers
            debugMarkers.forEach(marker => scene.remove(marker));
            debugMarkers = [];
            
            // Create markers for colliding blocks
            const markerGeometry = new THREE.BoxGeometry(1, 1, 1);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
            
            collidingBlocks.forEach(([x, y, z]) => {
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(x + 0.5, y + 0.5, z + 0.5);
                scene.add(marker);
                debugMarkers.push(marker);
            });
            
            // Add a marker for the player's collision box
            const playerMarkerGeometry = new THREE.BoxGeometry(
                playerRadius * 2, playerHeight, playerRadius * 2
            );
            const playerMarkerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, wireframe: true 
            });
            const playerMarker = new THREE.Mesh(playerMarkerGeometry, playerMarkerMaterial);
            playerMarker.position.copy(playerPos);
            playerMarker.position.y -= 0.5; // Adjust to match player's feet
            scene.add(playerMarker);
            debugMarkers.push(playerMarker);
        }

        if (physicsEnabled && world.updateChunks) {
            const playerPos = controls.getObject().position;
            world.updateChunks(playerPos.x, playerPos.z);
        }

        prevTime = time;
    }
    
    renderer.render(scene, camera);
} 