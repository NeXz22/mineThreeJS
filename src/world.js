import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map(); // Store blocks by position
        this.blockSize = 1;
        
        // Block textures
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {
            dirt: this.textureLoader.load('./textures/dirt.jpg'),
            grass: this.textureLoader.load('./textures/grass.jpg'),
            grassSide: this.textureLoader.load('./textures/grass_side.jpg'),
            stone: this.textureLoader.load('./textures/stone.jpg'),
            wood: this.textureLoader.load('./textures/wood.jpg'),
            leaves: this.textureLoader.load('./textures/leaves.png')
        };
        
        // Set texture properties for all textures
        Object.values(this.textures).forEach(texture => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        });
    }
    
    generateTerrain() {
        // Create a simple flat terrain for now
        const size = 20; // Size of the world (in blocks)
        
        // Create ground
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                // Add grass blocks at y=0
                this.addBlock(x, 0, z, 'grass');
                
                // Add dirt blocks below
                this.addBlock(x, -1, z, 'dirt');
                this.addBlock(x, -2, z, 'dirt');
                
                // Add stone blocks deeper
                for (let y = -3; y > -6; y--) {
                    this.addBlock(x, y, z, 'stone');
                }
                
                // Add some random hills
                if (Math.random() > 0.8) {
                    const height = Math.floor(Math.random() * 3) + 1;
                    for (let y = 1; y <= height; y++) {
                        this.addBlock(x, y, z, y === height ? 'grass' : 'dirt');
                    }
                }
            }
        }
        
        // Add some trees
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * size * 2) - size;
            const z = Math.floor(Math.random() * size * 2) - size;
            this.createTree(x, 1, z);
        }
    }
    
    createTree(x, y, z) {
        // Create trunk
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlock(x, y + i, z, 'wood');
        }
        
        // Create leaves
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy <= 2; dy++) {
                    // Skip corners for a more rounded look
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                    
                    // Add leaf block
                    this.addBlock(x + dx, y + trunkHeight + dy, z + dz, 'leaves');
                }
            }
        }
        
        // Add top leaves
        this.addBlock(x, y + trunkHeight + 3, z, 'leaves');
        this.addBlock(x + 1, y + trunkHeight + 3, z, 'leaves');
        this.addBlock(x - 1, y + trunkHeight + 3, z, 'leaves');
        this.addBlock(x, y + trunkHeight + 3, z + 1, 'leaves');
        this.addBlock(x, y + trunkHeight + 3, z - 1, 'leaves');
    }
    
    addBlock(x, y, z, type) {
        const position = `${x},${y},${z}`;
        
        // Skip if block already exists at this position
        if (this.blocks.has(position)) return;
        
        // Create block geometry
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        
        // Create materials based on block type
        let materials;
        
        switch (type) {
            case 'grass':
                materials = [
                    new THREE.MeshLambertMaterial({ map: this.textures.grassSide }),
                    new THREE.MeshLambertMaterial({ map: this.textures.grassSide }),
                    new THREE.MeshLambertMaterial({ map: this.textures.grass }),
                    new THREE.MeshLambertMaterial({ map: this.textures.dirt }),
                    new THREE.MeshLambertMaterial({ map: this.textures.grassSide }),
                    new THREE.MeshLambertMaterial({ map: this.textures.grassSide })
                ];
                break;
            case 'dirt':
                materials = Array(6).fill(new THREE.MeshLambertMaterial({ map: this.textures.dirt }));
                break;
            case 'stone':
                materials = Array(6).fill(new THREE.MeshLambertMaterial({ map: this.textures.stone }));
                break;
            case 'wood':
                materials = Array(6).fill(new THREE.MeshLambertMaterial({ map: this.textures.wood }));
                break;
            case 'leaves':
                materials = Array(6).fill(new THREE.MeshLambertMaterial({ 
                    map: this.textures.leaves,
                    transparent: true,
                    alphaTest: 0.5
                }));
                break;
            default:
                materials = Array(6).fill(new THREE.MeshLambertMaterial({ color: 0xffffff }));
        }
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.position.set(x * this.blockSize, y * this.blockSize, z * this.blockSize);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add to scene and store in blocks map
        this.scene.add(mesh);
        this.blocks.set(position, { mesh, type });
    }
    
    removeBlock(x, y, z) {
        const position = `${x},${y},${z}`;
        
        if (this.blocks.has(position)) {
            const block = this.blocks.get(position);
            this.scene.remove(block.mesh);
            this.blocks.delete(position);
        }
    }
} 