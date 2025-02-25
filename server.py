import asyncio
import json
import websockets

# Store connected clients and world state
clients = {}
world_blocks = {}

async def handle_client(websocket, path):
    # Generate a unique ID for this client
    client_id = len(clients) + 1
    clients[client_id] = websocket
    
    try:
        # Send initial world state to the new client
        await websocket.send(json.dumps({
            "type": "init",
            "id": client_id,
            "blocks": world_blocks
        }))
        
        # Broadcast new player to all other clients
        for cid, client in clients.items():
            if cid != client_id:
                await client.send(json.dumps({
                    "type": "player_join",
                    "id": client_id
                }))
        
        # Handle messages from this client
        async for message in websocket:
            data = json.loads(message)
            
            # Handle different message types
            if data["type"] == "position":
                # Broadcast player position to all other clients
                for cid, client in clients.items():
                    if cid != client_id:
                        await client.send(json.dumps({
                            "type": "player_move",
                            "id": client_id,
                            "position": data["position"]
                        }))
            
            elif data["type"] == "block_add":
                # Update world state
                block_key = f"{data['x']},{data['y']},{data['z']}"
                world_blocks[block_key] = data["block_type"]
                
                # Broadcast block addition to all other clients
                for cid, client in clients.items():
                    if cid != client_id:
                        await client.send(json.dumps({
                            "type": "block_add",
                            "x": data["x"],
                            "y": data["y"],
                            "z": data["z"],
                            "block_type": data["block_type"]
                        }))
            
            elif data["type"] == "block_remove":
                # Update world state
                block_key = f"{data['x']},{data['y']},{data['z']}"
                if block_key in world_blocks:
                    del world_blocks[block_key]
                
                # Broadcast block removal to all other clients
                for cid, client in clients.items():
                    if cid != client_id:
                        await client.send(json.dumps({
                            "type": "block_remove",
                            "x": data["x"],
                            "y": data["y"],
                            "z": data["z"]
                        }))
    
    finally:
        # Remove client when they disconnect
        del clients[client_id]
        
        # Broadcast player leave to all other clients
        for cid, client in clients.items():
            await client.send(json.dumps({
                "type": "player_leave",
                "id": client_id
            }))

# Start the WebSocket server
start_server = websockets.serve(handle_client, "localhost", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever() 