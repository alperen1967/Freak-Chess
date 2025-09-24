const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('createRoom', () => {
        let roomCode = ('00000' + Math.floor(Math.random() * 100000)).slice(-5);
        while (rooms[roomCode]) {
            roomCode = ('00000' + Math.floor(Math.random() * 100000)).slice(-5);
        }
        
        socket.join(roomCode);
        rooms[roomCode] = {
            players: [socket.id],
            board: null // Can be used to store board state
        };

        socket.emit('roomCreated', roomCode);
        console.log(`Room ${roomCode} created by ${socket.id}`);
    });

    socket.on('joinRoom', (roomCode) => {
        if (!rooms[roomCode]) {
            socket.emit('joinError', 'Oda bulunamadı.');
            return;
        }
        if (rooms[roomCode].players.length >= 2) {
            socket.emit('joinError', 'Oda dolu.');
            return;
        }

        socket.join(roomCode);
        rooms[roomCode].players.push(socket.id);

        const [player1, player2] = rooms[roomCode].players;

        io.to(player1).emit('gameStart', { color: 'white', room: roomCode });
        io.to(player2).emit('gameStart', { color: 'black', room: roomCode });

        console.log(`${socket.id} joined room ${roomCode}. Game starting.`);
    });

    socket.on('move', (data) => {
        console.log(`Move received in room ${data.room}:`, data.move);
        socket.to(data.room).emit('opponentMove', data.move);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Find which room the player was in and notify the other player
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                // If the game had 2 players, notify the other one
                if (room.players.length === 2) {
                    const otherPlayerId = room.players[1 - playerIndex];
                    io.to(otherPlayerId).emit('opponentDisconnected');
                }
                // Clean up the room
                delete rooms[roomCode];
                console.log(`Room ${roomCode} closed due to player disconnect.`);
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});