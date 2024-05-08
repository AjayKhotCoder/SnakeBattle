const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config(); // Ensure environment variables are loaded

// Create an Express application and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIO(server); 

// Set the server port
const PORT = process.env.PORT || 3030; // Adjust to your desired port

// Correct import of game-related functions
const { initializeGame, gameLoop, getUpdatedVelocity } = require("./game");
const { FRAME_RATE } = require("./constants");

// Enable CORS if needed (adjust policy as necessary)
const cors = require("cors");
app.use(cors());

// Serve static files (adjust path as needed)
const path = require("path");
app.use(express.static(path.join(__dirname, "..", "frontend"))); // Adjust to your folder structure

// Global variables for game management
const globalState = {};
const clientRooms = {};

// Function to manage the game loop
function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(globalState[roomName]);

    if (!winner) {
      emitGameState(roomName, globalState[roomName]);
    } else {
      emitGameOver(roomName, winner);
      globalState[roomName] = null; // Reset the game state for this room
      clearInterval(intervalId); // Stop the game loop
    }
  }, 1000 / FRAME_RATE);
}


// Function to emit the game state to a room
function emitGameState(room, gameState) {
  io.sockets.in(room).emit("gameState", JSON.stringify(gameState));
}

// Function to emit the game over event
function emitGameOver(room, winner) {
  io.sockets.in(room).emit("gameOver", JSON.stringify({ winner }));
}

// Socket.IO connection handling
io.on("connection", (client) => {
  console.log("Client connected:", client.id); // Log when a client connects

  client.on("keydown", handleKeydown);
  client.on("newGame", handleNewGame);
  client.on("joinGame", handleJoinGame);

  client.on("disconnect", () => {
    console.log("Client disconnected:", client.id); // Log when a client disconnects
  });

  // Function to handle creating a new game
  function handleNewGame() {
    const roomName = uuidv4(); // Generate a unique room code
    clientRooms[client.id] = roomName; // Store the room code
    client.emit("gameCode", roomName); // Emit the game code to the client

    globalState[roomName] = initializeGame(); // Initialize the game state
    client.join(roomName); // Client joins the room
    client.number = 1; // First player
    client.emit("init", 1); // Confirm initialization
  }

  // Function to handle joining an existing game
  function handleJoinGame(roomName) {
    const room = io.sockets.adapter.rooms[roomName]; // Find the room
   
    let allUsers;
    if(room){
        allUsers=room.sockets;
    }

    let numberofPlayers=0;
    if(allUsers){
        numberofPlayers=Object.keys(allUsers).length;
    }
    if(numberofPlayers===0){
        client.emit("unknownCode");
    }
    else if(numberofPlayers>1){
        client.emit("tooManyPlayers");
        return;
    }

    clientRooms[client.id]=roomName;
    client.join(roomName);

    client.number=2;

    client.emit("init",2);

    startGameInterval(roomName)
  };

  // Function to handle keydown events
  function handleKeydown(keyCode) {
    const roomName = clientRooms[client.id];
    if (!roomName) {
      return; // If the room name is not valid, return
    }

    try {
      keyCode = parseInt(keyCode); // Convert to integer
    } catch (e) {
      console.error("Error parsing key code:", e);
      return;
    }

    const velocity = getUpdatedVelocity(keyCode); // Get the updated velocity
    if (velocity) {
      globalState[roomName].players[client.number - 1].velocity = velocity; // Update velocity
    }
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});