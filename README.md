# Minecraft Clone with Three.js

A browser-based Minecraft-inspired voxel game built with Three.js. This project demonstrates how to create interactive 3D applications in the browser using modern web technologies.

## Overview

This project is a simple demonstration of how to use Three.js to create 3D applications in the browser. It implements basic Minecraft-like mechanics including:

- Procedurally generated terrain with simplex noise
- Block placement and removal
- First-person controls
- Basic physics and collision detection
- Different block types with textures
- Simple inventory system

## Getting Started

### Prerequisites

- Node.js and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:5173`

## Controls

- **WASD** or **Arrow Keys**: Move
- **Space**: Jump
- **Left Click**: Break block
- **Right Click**: Place block
- **1-5 Keys**: Select block type
- **F**: Toggle debug mode

## Key Features

### World Generation
The terrain is generated using simplex noise to create natural-looking landscapes with different elevations. The world includes various block types (dirt, grass, stone, wood, leaves) arranged in layers with trees scattered throughout.

### Player Physics
The game implements basic physics including gravity, jumping, and collision detection. The player can move around the world, jump on blocks, and is affected by gravity.

### Block Interaction
Players can add and remove blocks from the world using the mouse. Removed blocks are added to the player's inventory, and blocks can be placed from the inventory.

### Collision Detection
The game uses a cylinder-based collision system to detect interactions between the player and blocks, preventing the player from walking through solid objects.

## Project Structure

- `src/main.js` - Main game loop, physics, and controls
- `src/world.js` - World generation and block management
- `src/player.js` - Player interactions and inventory

## Performance Optimizations

The game includes several optimizations:

1. **Visibility culling**: Only visible blocks (those with at least one exposed face) are rendered
2. **Chunk-based rendering**: Support for loading/unloading chunks based on player position
3. **Texture optimization**: Using nearest-neighbor filtering for pixelated textures

## Future Improvements

- Multiplayer support
- More block types and biomes
- Improved physics and collision detection
- Mobile controls
- Saving and loading worlds

## Learning Resources

If you're interested in learning more about Three.js and browser-based 3D development:

- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Fundamentals](https://threejs.org/manual/)
- [Discover Three.js](https://discoverthreejs.com/)

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Three.js team for their amazing library
- Minecraft for the inspiration
