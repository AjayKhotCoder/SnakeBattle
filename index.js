const BACKGROUND_COLOR = "#659DBD";
const PLAYER_ONE_COLOUR = "#8D8741";
const PLAYER_TWO_COLOUR = "#FC4445";
const FOOD_COLOUR = "#FBEEC1";


// Ensure the Socket.IO connection with correct endpoint
const socket = io(); // Default connection to the Socket.IO server

// Ensure the DOM is fully loaded before setting up event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const gameScreen = document.getElementById("gameScreen");
  const initialScreen = document.getElementById("initialScreen");
  const newGameButton = document.getElementById("newGameButton");
  const joinGameButton = document.getElementById("joinGameButton");
  const gameCodeInput = document.getElementById("gameCodeInput");
  const playerNameInput = document.getElementById("playerNameInput");
  const gameCodeDisplay = document.getElementById("gameCodeDisplay");
 
  const playerOneName = document.getElementById("playerOneName");
  const playerTwoName = document.getElementById("playerTwoName");
  const playerOneScore = document.getElementById("playerOneScore");
  const playerTwoScore = document.getElementById("playerTwoScore");

  // Ensure new game button exists and set up event listener
  if (newGameButton) {
    newGameButton.addEventListener("click", () => {
      console.log("New Game button clicked");
      socket.emit("newGame"); // Emit the event to create a new game
      startGame(); // Transition to the game screen
    });
  } else {
    console.error("New Game button not found"); // Handle the error
  }

  // Ensure join game button exists and set up event listener
  if (joinGameButton) {
    joinGameButton.addEventListener("click", () => {
      const code = gameCodeInput.value.trim(); // Trim and validate input
      if (!code) {
        alert("Please enter a valid game code."); // Notify the user
        return;
      }
      socket.emit("joinGame", code); // Emit the event to join an existing game
      startGame(); // Transition to the game screen
    });
  } else {
    console.error("Join Game button not found"); // Handle the error
  }

  let canvas, canvasContext;
  let playerNumber;
  let gameActive = false; // Track whether the game is active

  // Function to start the game and transition to the game screen
  function startGame() {
    initialScreen.style.display = "none"; // Hide the initial screen
    gameScreen.style.display = "block"; // Show the game screen

    // Set up the canvas and context
    canvas = document.getElementById("canvas");
    canvasContext = canvas.getContext("2d");

    canvas.width = canvas.height = 600; // Set the canvas size

    // Set the background color
    canvasContext.fillStyle = BACKGROUND_COLOR;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    document.addEventListener("keydown", keydown); // Handle key events
    gameActive = true; // Indicate the game is active
  }

  // Function to handle keydown events
  function keydown(e) {
    socket.emit("keydown", e.keyCode); // Emit the key press event to the server
  }

  // Handle Socket.IO connection events

  socket.on("updateScore", (scores) => {
    playerOneScore.innerText = `Player 1 Score: ${scores.playerOne}`; // Update score
    playerTwoScore.innerText = `Player 2 Score: ${scores.playerTwo}`; // Update score
  });

  socket.on("connect", () => {
    console.log("Socket.IO connected"); // Debugging for connection success
  });

  socket.on("disconnect", () => {
    console.log("Socket.IO disconnected"); // Debugging for disconnection
  });

  // Handle the game code event
  socket.on("gameCode", (gameCode) => {
    console.log("Received game code:", gameCode); // Debugging
    gameCodeDisplay.innerText = gameCode; // Display the game code
  });

  // Handle the game state event and update the game
  socket.on("gameState", (gameState) => {
    if (!gameActive) {
      return; // If the game isn't active, ignore
    }
    gameState = JSON.parse(gameState); // Parse the game state
    requestAnimationFrame(() => paintGame(gameState)); // Paint the game
  });

  // Function to paint the game state on the canvas
  function paintGame(state) {
    canvasContext.fillStyle = BACKGROUND_COLOR;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    const food = state.food;
    const gridsize = state.gridsize;
    const size = canvas.width / gridsize;

    canvasContext.fillStyle = FOOD_COLOUR;
    canvasContext.fillRect(food.x * size, food.y * size, size, size);

    paintPlayer(state.players[0], size, PLAYER_ONE_COLOUR);
    paintPlayer(state.players[1], size, PLAYER_TWO_COLOUR);
  }

  function paintPlayer(playerState, size, colour) {
    const snake = playerState.snake;

    canvasContext.fillStyle = colour;
    for (let cell of snake) {
      canvasContext.fillRect(cell.x * size, cell.y * size, size, size);
    }
  }

  // Handle game over event
  socket.on("gameOver", (data) => {
    if (!gameActive) {
      return;
    }
    data = JSON.parse(data); // Parse the game over data
    gameActive = false; // Indicate the game is over

    if (data.winner === 1) {
        alert("Player 1 wins!"); // Notify if player 1 wins
      } else if (data.winner === 2) {
        alert("Player 2 wins!"); // Notify if player 2 wins
      } else {
        alert("Game over. No clear winner."); // Handle unclear winner scenario
      }
  
      reset(); // Reset the game state
  });

  // Handle unknown game code event
  socket.on("unknownCode", () => {
    // reset(); // Reset the game state
   // alert("Unknown game code. Please try again.");
  });

  // Handle too many players event
  socket.on("tooManyPlayers", () => {
    reset(); // Reset if there are too many players
    alert("This game is already in progress.");
  });

  //Handle score updates
  socket.on("updateScore",(scores)=>{
    playerOneScore.innerText='Player 1 Score: ${scores.playerOne}';
    playerTwoScore.innerText='Player 2 Score: ${scores.playerTwo}';
  });

  // Function to reset the game state
  function reset() {
    playerNumber = null; // Reset player number
    gameCodeInput.value = ""; // Clear the game code input
    initialScreen.style.display = "block"; // Show the initial screen
    gameScreen.style.display = "none"; // Hide the game screen
  }
});