import * as THREE from 'three';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;
        this.height = 1.8; // Player height in blocks
        this.speed = 5.0;  // Movement speed
        this.jumpForce = 10.0;
        this.selectedBlockType = 'dirt'; // Default block to place
        
        // Setup raycaster for block interaction
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 5; // Maximum reach distance
        
        // Create crosshair
        this.createCrosshair();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    createCrosshair() {
        // Create a simple crosshair
        const crosshairContainer = document.createElement('div');
        crosshairContainer.style.position = 'absolute';
        crosshairContainer.style.top = '50%';
        crosshairContainer.style.left = '50%';
        crosshairContainer.style.transform = 'translate(-50%, -50%)';
        crosshairContainer.style.color = 'white';
        crosshairContainer.style.fontSize = '24px';
        crosshairContainer.style.fontWeight = 'bold';
        crosshairContainer.style.userSelect = 'none';
        crosshairContainer.textContent = '+';
        document.body.appendChild(crosshairContainer);
    }
    
    initEventListeners() {
        // Mouse click for block interaction
        document.addEventListener('mousedown', (event) => {
            // Left click to remove block
            if (event.button === 0) {
                this.removeBlock();
            }
            // Right click to place block
            else if (event.button === 2) {
                this.placeBlock();
            }
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Number keys to select block type
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Digit1') this.selectedBlockType = 'dirt';
            else if (event.code === 'Digit2') this.selectedBlockType = 'grass';
            else if (event.code === 'Digit3') this.selectedBlockType = 'stone';
            else if (event.code === 'Digit4') this.selectedBlockType = 'wood';
            else if (event.code === 'Digit5') this.selectedBlockType = 'leaves';
            
            // Update HUD to show selected block
            this.updateSelectedBlockHUD();
        });
        
        // Create selected block HUD
        this.createSelectedBlockHUD();
    }
    
    createSelectedBlockHUD() {
        const hudContainer = document.createElement('div');
        hudContainer.id = 'selected-block';
        hudContainer.style.position = 'absolute';
        hudContainer.style.bottom = '20px';
        hudContainer.style.left = '50%';
        hudContainer.style.transform = 'translateX(-50%)';
        hudContainer.style.color = 'white';
        hudContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        hudContainer.style.padding = '5px 10px';
        hudContainer.style.borderRadius = '5px';
        hudContainer.style.fontFamily = 'monospace';
        document.body.appendChild(hudContainer);
        
        this.updateSelectedBlockHUD();
    }
    
    updateSelectedBlockHUD() {
        const hudElement = document.getElementById('selected-block');
        if (hudElement) {
            hudElement.textContent = `Selected Block: ${this.selectedBlockType} (1-5 to change)`;
        }
    }
    
    removeBlock() {
        // Cast ray from camera
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Get intersections with blocks
        const intersects = this.raycaster.intersectObjects(this.world.scene.children);
        
        if (intersects.length > 0) {
            // Get the first intersected object
            const intersectedObject = intersects[0].object;
            
            // Calculate block position from object position
            const blockX = Math.round(intersectedObject.position.x);
            const blockY = Math.round(intersectedObject.position.y);
            const blockZ = Math.round(intersectedObject.position.z);
            
            // Remove the block
            this.world.removeBlock(blockX, blockY, blockZ);
            
            console.log(`Removed block at (${blockX}, ${blockY}, ${blockZ})`);
        }
    }
    
    placeBlock() {
        // Cast ray from camera
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Get intersections with blocks
        const intersects = this.raycaster.intersectObjects(this.world.scene.children);
        
        if (intersects.length > 0) {
            // Get the first intersected object
            const intersect = intersects[0];
            
            // Calculate position for new block
            // We need to place it adjacent to the face that was hit
            const normal = intersect.face.normal;
            const point = intersect.point;
            
            // Add a small offset to avoid floating point issues
            const x = Math.round(point.x + normal.x * 0.5);
            const y = Math.round(point.y + normal.y * 0.5);
            const z = Math.round(point.z + normal.z * 0.5);
            
            // Don't place block if it would overlap with the player
            const playerPos = this.camera.position;
            const playerBlockX = Math.floor(playerPos.x);
            const playerBlockY = Math.floor(playerPos.y);
            const playerBlockZ = Math.floor(playerPos.z);
            
            // Check if the new block would be at the player's position or head position
            if ((x === playerBlockX && y === playerBlockY && z === playerBlockZ) ||
                (x === playerBlockX && y === playerBlockY - 1 && z === playerBlockZ)) {
                console.log("Can't place block here - would overlap with player");
                return;
            }
            
            // Add the new block
            this.world.addBlock(x, y, z, this.selectedBlockType);
            
            console.log(`Placed ${this.selectedBlockType} block at (${x}, ${y}, ${z})`);
        }
    }
    
    update(delta) {
        // This will be used for player physics updates
    }
} 