import * as THREE from 'three';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;
        this.height = 1.8; // Player height in blocks
        this.speed = 5.0;  // Movement speed
        this.jumpForce = 10.0;
        this.selectedBlockType = 'dirt'; // Default block to place
        
        // Initialize inventory first, before any methods that might use it
        this.inventory = {
            dirt: 64,
            grass: 64,
            stone: 64,
            wood: 64,
            leaves: 64
        };
        
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
        
        // Add inventory display
        const inventoryContainer = document.createElement('div');
        inventoryContainer.id = 'inventory';
        inventoryContainer.style.position = 'absolute';
        inventoryContainer.style.bottom = '60px';
        inventoryContainer.style.left = '50%';
        inventoryContainer.style.transform = 'translateX(-50%)';
        inventoryContainer.style.color = 'white';
        inventoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        inventoryContainer.style.padding = '5px 10px';
        inventoryContainer.style.borderRadius = '5px';
        inventoryContainer.style.fontFamily = 'monospace';
        document.body.appendChild(inventoryContainer);
        
        this.updateSelectedBlockHUD();
        this.updateInventoryHUD();
    }
    
    updateSelectedBlockHUD() {
        const hudElement = document.getElementById('selected-block');
        if (hudElement) {
            hudElement.textContent = `Selected Block: ${this.selectedBlockType} (1-5 to change)`;
        }
    }
    
    updateInventoryHUD() {
        const inventoryElement = document.getElementById('inventory');
        if (inventoryElement && this.inventory) {
            inventoryElement.innerHTML = Object.entries(this.inventory)
                .map(([type, count]) => `${type}: ${count}`)
                .join(' | ');
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
            
            // Get the block type before removing it
            const position = `${blockX},${blockY},${blockZ}`;
            const blockData = this.world.blocks.get(position);
            const blockType = blockData ? blockData.type : null;
            
            // Remove the block
            this.world.removeBlock(blockX, blockY, blockZ);
            
            console.log(`Removed block at (${blockX}, ${blockY}, ${blockZ})`);
            
            // After successfully removing a block, add it to inventory
            if (blockType && this.inventory && this.inventory[blockType] !== undefined) {
                this.inventory[blockType]++;
                this.updateInventoryHUD();
            }
        }
    }
    
    placeBlock() {
        // Only place if we have blocks in inventory
        if (this.inventory[this.selectedBlockType] <= 0) {
            console.log(`No ${this.selectedBlockType} blocks left in inventory`);
            return;
        }
        
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
            
            // Improved player collision check
            const playerPos = this.camera.position;
            const playerRadius = 0.3;
            const playerHeight = 1.8;
            
            // Check if the new block would collide with the player
            const wouldCollide = this.checkBlockPlayerCollision(x, y, z, playerPos, playerRadius, playerHeight);
            
            if (wouldCollide) {
                console.log("Can't place block here - would overlap with player");
                return;
            }
            
            // Add the new block
            this.world.addBlock(x, y, z, this.selectedBlockType);
            
            console.log(`Placed ${this.selectedBlockType} block at (${x}, ${y}, ${z})`);
            
            // If block was successfully placed, reduce inventory
            this.inventory[this.selectedBlockType]--;
            this.updateInventoryHUD();
        }
    }
    
    checkBlockPlayerCollision(blockX, blockY, blockZ, playerPos, playerRadius, playerHeight) {
        // Check if the block would collide with the player's collision cylinder
        
        // Calculate block center
        const blockCenterX = blockX + 0.5;
        const blockCenterY = blockY + 0.5;
        const blockCenterZ = blockZ + 0.5;
        
        // Calculate player center (adjusted for height)
        const playerCenterX = playerPos.x;
        const playerCenterY = playerPos.y - 0.5 + playerHeight / 2;
        const playerCenterZ = playerPos.z;
        
        // Check horizontal distance (using squared distance for efficiency)
        const dx = blockCenterX - playerCenterX;
        const dz = blockCenterZ - playerCenterZ;
        const horizontalDistSq = dx * dx + dz * dz;
        
        // Block radius is 0.5, so combined radius is playerRadius + 0.5
        const combinedRadius = playerRadius + 0.5;
        
        if (horizontalDistSq >= combinedRadius * combinedRadius) {
            return false; // No collision possible if too far horizontally
        }
        
        // Check vertical overlap
        const playerBottom = playerCenterY - playerHeight / 2;
        const playerTop = playerCenterY + playerHeight / 2;
        const blockBottom = blockCenterY - 0.5;
        const blockTop = blockCenterY + 0.5;
        
        // Check if block overlaps with player vertically
        if (playerBottom >= blockTop || playerTop <= blockBottom) {
            return false; // No vertical overlap
        }
        
        // If we get here, there's both horizontal and vertical overlap
        return true;
    }
    
    update(delta) {
        // This will be used for player physics updates
    }
} 