const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { startSelfPing } = require('./utils/selfPing');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const secret = "my-secret-key";
const cors_options = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://anime-character-guessr.onrender.com',
        'https://anime-character-guessr.vercel.app',
        'https://anime-character-guessr.netlify.app'
      ],
      methods: ['GET', 'POST'],
      credentials: true
}

const io = new Server(server, {
  cors: cors_options
});

app.use(cors(cors_options));

// Store room data
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle room creation
  socket.on('createRoom', ({ roomId, username }) => {
    // Basic validation
    if (!username || username.trim().length === 0) {
      socket.emit('error', { message: 'Username cannot be empty' });
      return;
    }
    
    // Although the host is the first player, ensure room doesn't somehow exist
    if (rooms.has(roomId)) {
        socket.emit('error', { message: 'Room already exists unexpectedly' });
        return;
    }

    // Create new room with host
    rooms.set(roomId, {
      host: socket.id,
      players: [{
        id: socket.id,
        username,
        isHost: true,
        score: 0,
        ready: false,
        guesses: ''
      }]
    });

    // Join socket to room
    socket.join(roomId);
    
    // Send room data back to host
    io.to(roomId).emit('updatePlayers', {
      players: rooms.get(roomId).players
    });

    console.log(`Room ${roomId} created by ${username}`);
  });

  // Handle room joining
  socket.on('joinRoom', ({ roomId, username }) => {
    // Basic validation
    if (!username || username.trim().length === 0) {
        socket.emit('error', { message: 'Username cannot be empty' });
        return;
    }

    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check for duplicate username (case-insensitive)
    const isUsernameTaken = room.players.some(
      player => player.username.toLowerCase() === username.toLowerCase()
    );

    if (isUsernameTaken) {
      socket.emit('error', { message: 'Username is already taken in this room' });
      return;
    }

    // Add player to room
    room.players.push({
      id: socket.id,
      username,
      isHost: false,
      score: 0,
      ready: false,
      guesses: ''
    });

    // Join socket to room
    socket.join(roomId);

    // Send updated player list to all clients in room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });

    console.log(`${username} joined room ${roomId}`);
  });

  // Handle ready status toggle
  socket.on('toggleReady', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Find the player
    const player = room.players.find(p => p.id === socket.id);
    
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Don't allow host to toggle ready status
    if (player.isHost) {
      socket.emit('error', { message: '房主不需要准备' });
      return;
    }

    // Toggle ready status
    player.ready = !player.ready;

    // Notify all players in the room about the update
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });

    console.log(`Player ${player.username} ${player.ready ? 'is now ready' : 'is no longer ready'} in room ${roomId}`);
  });

  // Handle game settings update
  socket.on('updateGameSettings', ({ roomId, settings }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Only allow host to update settings
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: '只有房主可以更改设置' });
      return;
    }

    // Store settings in room data
    room.settings = settings;

    // Broadcast settings to all clients in the room
    io.to(roomId).emit('updateGameSettings', { settings });
    
    console.log(`Game settings updated in room ${roomId}`);
  });

  // Handle game start
  socket.on('gameStart', ({ roomId, character, settings }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Only allow host to start game
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    // Check if all non-disconnected players are ready
    const allReady = room.players.every(p => p.isHost || p.ready || p.disconnected);
    if (!allReady) {
      socket.emit('error', { message: '所有玩家必须准备好才能开始游戏' });
      return;
    }

    // Store current game state in room data
    room.currentGame = {
      character,
      settings,
      startTime: Date.now(),
      guesses: [] // Initialize guesses as an array of objects
    };

    // Reset all players' game state
    room.players.forEach(p => {
      p.guesses = '';
      // Initialize each player's guesses array using their username
      room.currentGame.guesses.push({ username: p.username, guesses: [] });
    });

    // Broadcast game start to all clients in the room
    io.to(roomId).emit('gameStart', { 
      character,
      settings
    });

    // Broadcast updated players to all clients in the room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });
    
    console.log(`Game started in room ${roomId}`);
  });

  // Handle player guesses
  socket.on('playerGuess', ({ roomId, guessResult }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Store guess in the player's guesses array using their username
    if (room.currentGame) {
      const playerGuesses = room.currentGame.guesses.find(g => g.username === player.username);
      if (playerGuesses) {
        playerGuesses.guesses.push({
          playerId: socket.id,
          playerName: player.username,
          ...guessResult,
          timestamp: Date.now()
        });
      }
    }

    // Update player's guesses string
    player.guesses += guessResult.isCorrect ? '✔' : '❌';

    // Broadcast updated players to all clients in the room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });
    
    console.log(`Player ${player.username} made a guess in room ${roomId}: ${guessResult.name} (${guessResult.isCorrect ? 'correct' : 'incorrect'})`);
  });

  // Handle game end
  socket.on('gameEnd', ({ roomId, result }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Update player's guesses string
    player.guesses += result === 'win' ? '✌' : '💀';

    // Check if all players have ended their game
    const allEnded = room.players.every(p => p.guesses.includes('✌') || p.guesses.includes('💀'));
    const winner = room.players.find(p => p.guesses.includes('✌'));

    if (winner) {
      // Increment winner's score by 1
      winner.score += 1;

      // Broadcast winner and answer to all clients
      io.to(roomId).emit('gameEnded', {
        message: `游戏结束！赢家是: ${winner.username}`,
        answer: room.currentGame.character,
        guesses: room.currentGame.guesses // Include guesses history
      });
    } else if (allEnded) {
      // Broadcast game end with answer to all clients
      io.to(roomId).emit('gameEnded', {
        message: '游戏结束！所有玩家都未猜中',
        answer: room.currentGame.character,
        guesses: room.currentGame.guesses // Include guesses history
      });
    }

    // Broadcast updated players to all clients in the room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });
    
    console.log(`Player ${player.username} ended their game in room ${roomId} with result: ${result}`);

    // Broadcast reset ready status to all clients in the room
    io.to(roomId).emit('resetReadyStatus');
  });

  // Handle game settings request
  socket.on('requestGameSettings', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Send current settings to the requesting client
    if (room.settings) {
      socket.emit('updateGameSettings', { settings: room.settings });
      console.log(`Game settings sent to new player in room ${roomId}`);
    }
  });

  // Handle timeout event
  socket.on('timeOut', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Append ⏱️ to player's guesses
    player.guesses += '⏱️';

    // Broadcast updated players to all clients in the room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });

    console.log(`Player ${player.username} timed out in room ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove player from their room
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];

        disconnectedPlayer.disconnected = true; // Record disconnection status
        
        if (room.host === socket.id) {
          rooms.delete(roomId);
          // Notify remaining players the room is closed
          io.to(roomId).emit('roomClosed', { message: 'Host disconnected' });
          console.log(`Host ${disconnectedPlayer.username} disconnected. Room ${roomId} closed and disbanded.`);
        } else {
          // Otherwise just update player list for remaining players
          io.to(roomId).emit('updatePlayers', {
            players: room.players
          });
          console.log(`Player ${disconnectedPlayer.username} disconnected from room ${roomId}.`);
        }
        break; // Exit loop once player is found and handled
      }
    }
    
    console.log(`User ${socket.id} disconnected`); // General disconnect log
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('Server is active');
});

// startSelfPing();

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

app.get('/', (req, res) => {
    res.send('Hello from the server!');
  });