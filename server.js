const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const rooms = {};

const ARABIC_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي','ء','ئ','ؤ','لا','آ','أ','إ','ة','ى'];

io.on('connection', (socket) => {
  socket.on('create-room', ({ hostName }) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
      host: socket.id,
      players: [],
      letters: ARABIC_LETTERS.slice(0, 27).map(char => ({ char, claimedBy: null }))
    };
    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
  });

  socket.on('join-room', ({ playerName, roomCode, team }) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      rooms[roomCode].players.push({ id: socket.id, name: playerName, team });
      io.to(roomCode).emit('game-started', {
        roomCode,
        letters: rooms[roomCode].letters
      });
    } else {
      socket.emit('error-msg', 'رمز الغرفة غير صحيح');
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
