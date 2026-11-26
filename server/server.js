const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const rooms = {};
const MAX_PLAYERS = 10;
const ALLOWED_COLORS = new Set([
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#a855f7', '#ec4899', '#f97316', '#06b6d4'
]);

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms[code]);
  return code;
}

function serializePlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    color: p.color,
    isHost: p.id === room.hostId
  }));
}

function removePlayerFromRooms(socketId) {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    const index = room.players.findIndex((p) => p.id === socketId);
    if (index === -1) continue;

    room.players.splice(index, 1);

    if (room.players.length === 0) {
      delete rooms[code];
    } else {
      if (room.hostId === socketId) {
        room.hostId = room.players[0].id;
        io.to(room.hostId).emit('host_changed', { isHost: true });
      }
      io.to(code).emit('update_players', serializePlayers(room));
    }
    return code;
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('Подключился клиент:', socket.id);

  socket.on('create_lobby', ({ nickname, color } = {}) => {
    const cleanNick = (nickname || '').trim();
    if (!cleanNick) {
      return socket.emit('error_message', 'Введите никнейм');
    }

    removePlayerFromRooms(socket.id);

    const safeColor = ALLOWED_COLORS.has(color) ? color : '#38bdf8';
    const roomCode = generateRoomCode();

    rooms[roomCode] = {
      hostId: socket.id,
      players: [{ id: socket.id, nickname: cleanNick, color: safeColor }]
    };

    socket.join(roomCode);
    socket.emit('lobby_joined', {
      roomCode,
      players: serializePlayers(rooms[roomCode]),
      isHost: true
    });
  });

  socket.on('join_lobby', ({ nickname, roomCode, color } = {}) => {
    const cleanNick = (nickname || '').trim();
    const cleanCode = (roomCode || '').trim().toUpperCase();

    if (!cleanNick) {
      return socket.emit('error_message', 'Введите никнейм');
    }
    if (!cleanCode) {
      return socket.emit('error_message', 'Введите код лобби');
    }

    const room = rooms[cleanCode];
    if (!room) {
      return socket.emit('error_message', 'Лобби не найдено');
    }
    if (room.players.length >= MAX_PLAYERS) {
      return socket.emit('error_message', 'Лобби переполнено');
    }

    removePlayerFromRooms(socket.id);

    const safeColor = ALLOWED_COLORS.has(color) ? color : '#38bdf8';
    room.players.push({ id: socket.id, nickname: cleanNick, color: safeColor });

    socket.join(cleanCode);
    socket.emit('lobby_joined', {
      roomCode: cleanCode,
      players: serializePlayers(room),
      isHost: room.hostId === socket.id
    });

    io.to(cleanCode).emit('update_players', serializePlayers(room));
  });

  socket.on('leave_lobby', () => {
    const code = removePlayerFromRooms(socket.id);
    if (code) socket.leave(code);
  });

  socket.on('start_game', () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (room.hostId === socket.id) {
        io.to(code).emit('game_started', { roomCode: code });
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Отключился клиент:', socket.id);
    removePlayerFromRooms(socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});