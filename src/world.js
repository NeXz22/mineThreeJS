import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map(); // Store blocks by position
        this.blockSize = 1;
        
        // Create noise function
        this.noise2D = createNoise2D();
        
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

        // Chunk-based rendering configuration
        this.useChunks = false; // Set to true to enable chunk-based rendering
        
        if (this.useChunks) {
            this.chunkSize = 16;
            this.chunks = new Map();
            this.loadDistance = 3; // Number of chunks to load in each direction
        }
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
        
        // Don't add if block already exists
        if (this.blocks.has(position)) {
            return;
        }
        
        // Create geometry
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
        
        // Check if the block is visible (has at least one exposed face)
        const isVisible = this.isBlockVisible(x, y, z);
        mesh.visible = isVisible;
        
        // Add to scene and store in blocks map
        this.scene.add(mesh);
        this.blocks.set(position, { mesh, type, visible: isVisible });
        
        // Update visibility of neighboring blocks
        this.updateBlockVisibility(x, y, z);
    }
    
    removeBlock(x, y, z) {
        const position = `${x},${y},${z}`;
        
        if (this.blocks.has(position)) {
            const block = this.blocks.get(position);
            this.scene.remove(block.mesh);
            this.blocks.delete(position);
            
            // Update visibility of neighboring blocks
            this.updateBlockVisibility(x, y, z);
        }
    }
    
    generateProceduralTerrain() {
        const size = 20; // Size of the world (in blocks)
        
        // First, create all blocks without adding them to the scene
        const blocksToAdd = [];
        
        // First, ensure there's a flat area at spawn
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                // Create flat ground at y=0
                blocksToAdd.push({x, y: 0, z, type: 'grass'});
                blocksToAdd.push({x, y: -1, z, type: 'dirt'});
                blocksToAdd.push({x, y: -2, z, type: 'dirt'});
                
                // Add stone below
                for (let y = -3; y > -6; y--) {
                    blocksToAdd.push({x, y, z, type: 'stone'});
                }
            }
        }
        
        // Then create the rest of the terrain
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                // Skip spawn area which we already handled
                if (x >= -2 && x <= 2 && z >= -2 && z <= 2) continue;
                
                // Generate height using noise
                const elevation = Math.floor(
                    this.noise2D(x * 0.05, z * 0.05) * 4 + 
                    this.noise2D(x * 0.1, z * 0.1) * 2
                );
                
                // Add grass block at the top
                blocksToAdd.push({x, y: elevation, z, type: 'grass'});
                
                // Add dirt below the surface
                for (let y = elevation - 1; y > elevation - 4; y--) {
                    blocksToAdd.push({x, y, z, type: 'dirt'});
                }
                
                // Add stone even deeper
                for (let y = elevation - 4; y > elevation - 10; y--) {
                    blocksToAdd.push({x, y, z, type: 'stone'});
                }
                
                // Add trees randomly, but not at spawn
                if (Math.random() > 0.98 && (Math.abs(x) > 3 || Math.abs(z) > 3)) {
                    // Tree trunk
                    for (let y = elevation + 1; y < elevation + 6; y++) {
                        blocksToAdd.push({x, y, z, type: 'wood'});
                    }
                    
                    // Tree leaves
                    for (let lx = x - 2; lx <= x + 2; lx++) {
                        for (let lz = z - 2; lz <= z + 2; lz++) {
                            for (let ly = elevation + 4; ly < elevation + 8; ly++) {
                                // Skip trunk positions
                                if (lx === x && lz === z && ly < elevation + 6) continue;
                                
                                // Add leaves with some randomness for a natural look
                                if (Math.random() > 0.2) {
                                    blocksToAdd.push({x: lx, y: ly, z: lz, type: 'leaves'});
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Now add all blocks to the world
        // First, create a temporary map to check visibility efficiently
        const tempBlockMap = new Map();
        blocksToAdd.forEach(({x, y, z}) => {
            tempBlockMap.set(`${x},${y},${z}`, true);
        });
        
        // Helper function to check if a block would be visible
        const wouldBeVisible = (x, y, z) => {
            const neighbors = [
                [x+1, y, z],
                [x-1, y, z],
                [x, y+1, z],
                [x, y-1, z],
                [x, y, z+1],
                [x, y, z-1]
            ];
            
            for (const [nx, ny, nz] of neighbors) {
                const neighborKey = `${nx},${ny},${nz}`;
                if (!tempBlockMap.has(neighborKey)) {
                    return true;
                }
            }
            return false;
        };
        
        // Add only visible blocks to the scene
        blocksToAdd.forEach(({x, y, z, type}) => {
            if (wouldBeVisible(x, y, z)) {
                this.addBlockDirect(x, y, z, type, true); // Add as visible
            } else {
                this.addBlockDirect(x, y, z, type, false); // Add as invisible
            }
        });
    }

    isBlockVisible(x, y, z) {
        // Check if the block has at least one exposed face
        const neighbors = [
            [x+1, y, z],
            [x-1, y, z],
            [x, y+1, z],
            [x, y-1, z],
            [x, y, z+1],
            [x, y, z-1]
        ];
        
        // If any neighboring position doesn't have a block, this block is visible
        for (const [nx, ny, nz] of neighbors) {
            const neighborKey = `${nx},${ny},${nz}`;
            if (!this.blocks.has(neighborKey)) {
                return true;
            }
        }
        
        return false;
    }

    updateBlockVisibility(x, y, z) {
        // Update visibility for this block and its neighbors
        const positions = [
            [x, y, z],
            [x+1, y, z],
            [x-1, y, z],
            [x, y+1, z],
            [x, y-1, z],
            [x, y, z+1],
            [x, y, z-1]
        ];
        
        for (const [bx, by, bz] of positions) {
            const blockKey = `${bx},${by},${bz}`;
            const blockData = this.blocks.get(blockKey);
            
            if (blockData) {
                const isVisible = this.isBlockVisible(bx, by, bz);
                
                // If visibility changed, update the mesh
                if (isVisible !== blockData.visible) {
                    blockData.visible = isVisible;
                    blockData.mesh.visible = isVisible;
                }
            }
        }
    }

    // New method for direct block addition without visibility checks
    addBlockDirect(x, y, z, type, isVisible) {
        const position = `${x},${y},${z}`;
        
        // Don't add if block already exists
        if (this.blocks.has(position)) {
            return;
        }
        
        // Create geometry
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
        mesh.visible = isVisible;
        
        // Add to scene and store in blocks map
        this.scene.add(mesh);
        this.blocks.set(position, { mesh, type, visible: isVisible });
    }

    // Update this method to check if chunks are enabled
    updateChunks(playerX, playerZ) {
        if (!this.useChunks) return;
        
        const playerChunkX = Math.floor(playerX / this.chunkSize);
        const playerChunkZ = Math.floor(playerZ / this.chunkSize);
        
        // Determine which chunks should be loaded
        const chunksToLoad = new Set();
        for (let x = playerChunkX - this.loadDistance; x <= playerChunkX + this.loadDistance; x++) {
            for (let z = playerChunkZ - this.loadDistance; z <= playerChunkZ + this.loadDistance; z++) {
                const chunkKey = `${x},${z}`;
                chunksToLoad.add(chunkKey);
                
                // Load chunk if not already loaded
                if (!this.chunks.has(chunkKey)) {
                    this.loadChunk(x, z);
                }
            }
        }
        
        // Unload chunks that are too far away
        for (const chunkKey of this.chunks.keys()) {
            if (!chunksToLoad.has(chunkKey)) {
                this.unloadChunk(chunkKey);
            }
        }
    }

    loadChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Create chunk object
        const chunk = {
            blocks: new Map(),
            loaded: true
        };
        
        // Generate terrain for this chunk
        this.generateChunkTerrain(chunkX, chunkZ, chunk);
        
        // Store chunk
        this.chunks.set(chunkKey, chunk);
    }

    unloadChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        
        // Remove all blocks in this chunk from the scene
        for (const blockData of chunk.blocks.values()) {
            this.scene.remove(blockData.mesh);
        }
        
        // Remove chunk from map
        this.chunks.delete(chunkKey);
    }

    generateChunkTerrain(chunkX, chunkZ, chunk) {
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        const endX = startX + this.chunkSize;
        const endZ = startZ + this.chunkSize;
        
        // Create blocks for this chunk
        const blocksToAdd = [];
        
        // Special case for spawn area
        const isSpawnChunk = (chunkX === 0 && chunkZ === 0);
        
        if (isSpawnChunk) {
            // Create flat spawn area
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    // Skip if outside this chunk
                    if (x < startX || x >= endX || z < startZ || z >= endZ) continue;
                    
                    // Create flat ground at y=0
                    blocksToAdd.push({x, y: 0, z, type: 'grass'});
                    blocksToAdd.push({x, y: -1, z, type: 'dirt'});
                    blocksToAdd.push({x, y: -2, z, type: 'dirt'});
                    
                    // Add stone below
                    for (let y = -3; y > -6; y--) {
                        blocksToAdd.push({x, y, z, type: 'stone'});
                    }
                }
            }
        }
        
        // Generate terrain for this chunk
        for (let x = startX; x < endX; x++) {
            for (let z = startZ; z < endZ; z++) {
                // Skip spawn area which we already handled
                if (isSpawnChunk && x >= -2 && x <= 2 && z >= -2 && z <= 2) continue;
                
                // Generate height using noise
                const elevation = Math.floor(
                    this.noise2D(x * 0.05, z * 0.05) * 4 + 
                    this.noise2D(x * 0.1, z * 0.1) * 2
                );
                
                // Add grass block at the top
                blocksToAdd.push({x, y: elevation, z, type: 'grass'});
                
                // Add dirt below the surface
                for (let y = elevation - 1; y > elevation - 4; y--) {
                    blocksToAdd.push({x, y, z, type: 'dirt'});
                }
                
                // Add stone even deeper
                for (let y = elevation - 4; y > elevation - 10; y--) {
                    blocksToAdd.push({x, y, z, type: 'stone'});
                }
                
                // Add trees randomly, but not at spawn
                if (Math.random() > 0.98 && (Math.abs(x) > 3 || Math.abs(z) > 3)) {
                    // Tree trunk
                    for (let y = elevation + 1; y < elevation + 6; y++) {
                        blocksToAdd.push({x, y, z, type: 'wood'});
                    }
                    
                    // Tree leaves
                    for (let lx = x - 2; lx <= x + 2; lx++) {
                        for (let lz = z - 2; lz <= z + 2; lz++) {
                            for (let ly = elevation + 4; ly < elevation + 8; ly++) {
                                // Skip trunk positions
                                if (lx === x && lz === z && ly < elevation + 6) continue;
                                
                                // Add leaves with some randomness for a natural look
                                if (Math.random() > 0.2) {
                                    blocksToAdd.push({x: lx, y: ly, z: lz, type: 'leaves'});
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Now add all blocks to the chunk
        // First, create a temporary map to check visibility efficiently
        const tempBlockMap = new Map();
        blocksToAdd.forEach(({x, y, z}) => {
            tempBlockMap.set(`${x},${y},${z}`, true);
        });
        
        // Helper function to check if a block would be visible
        const wouldBeVisible = (x, y, z) => {
            const neighbors = [
                [x+1, y, z],
                [x-1, y, z],
                [x, y+1, z],
                [x, y-1, z],
                [x, y, z+1],
                [x, y, z-1]
            ];
            
            for (const [nx, ny, nz] of neighbors) {
                const neighborKey = `${nx},${ny},${nz}`;
                if (!tempBlockMap.has(neighborKey)) {
                    return true;
                }
            }
            return false;
        };
        
        // Add only visible blocks to the scene
        blocksToAdd.forEach(({x, y, z, type}) => {
            if (wouldBeVisible(x, y, z)) {
                this.addBlockToChunk(x, y, z, type, chunk, true); // Add as visible
            } else {
                this.addBlockToChunk(x, y, z, type, chunk, false); // Add as invisible
            }
        });
    }

    // Add this helper method to add blocks to a chunk
    addBlockToChunk(x, y, z, type, chunk, isVisible) {
        const position = `${x},${y},${z}`;
        
        // Don't add if block already exists
        if (this.blocks.has(position) || chunk.blocks.has(position)) {
            return;
        }
        
        // Create geometry
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
        mesh.visible = isVisible;
        
        // Add to scene and store in blocks map
        this.scene.add(mesh);
        
        // Store in both the global blocks map and the chunk's blocks map
        const blockData = { mesh, type, visible: isVisible };
        this.blocks.set(position, blockData);
        chunk.blocks.set(position, blockData);
    }
} 