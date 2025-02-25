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
const gravity = 9.8;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();

init();
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 2;

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
    world.generateTerrain();

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
                velocity.y += 10;
                canJump = false;
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
    
    if (controls.isLocked) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

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

        // Update controls
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Update vertical position
        controls.getObject().position.y += velocity.y * delta;

        // Simple collision detection with ground
        if (controls.getObject().position.y < 2) {
            velocity.y = 0;
            controls.getObject().position.y = 2;
            canJump = true;
        }

        // Update position display
        const position = controls.getObject().position;
        document.getElementById('position').textContent = 
            `X: ${Math.round(position.x)}, Y: ${Math.round(position.y)}, Z: ${Math.round(position.z)}`;

        prevTime = time;
    }

    renderer.render(scene, camera);
} 