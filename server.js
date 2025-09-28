
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// The initial state of the board. The server must know this.
const INITIAL_BOARD = [
    ['b_rook', 'b_knight', 'b_bishop', 'b_queen', 'b_king', 'b_bishop', 'b_knight', 'b_rook'],
    ['b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn'],
    ...Array.from({ length: 4 }, () => Array(8).fill(null)),
    ['w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn'],
    ['w_rook', 'w_knight', 'w_bishop', 'w_queen', 'w_king', 'w_bishop', 'w_knight', 'w_rook']
];

app.use(express.static(__dirname));

const rooms = {};
const MAX_ROOM_SIZE = 5;

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('createRoom', (data) => {
        let roomCode = ('00000' + Math.floor(Math.random() * 100000)).slice(-5);
        while (rooms[roomCode]) {
            roomCode = ('00000' + Math.floor(Math.random() * 100000)).slice(-5);
        }
        
        socket.join(roomCode);
        rooms[roomCode] = {
            players: [socket.id],
            spectators: [],
            board: null, 
            turn: 'white',
            rules: data.rules // Store the rules
        };

        socket.emit('roomCreated', roomCode);
        console.log(`Room ${roomCode} created by ${socket.id} with rules: ${data.rules}`);
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) {
            return socket.emit('joinError', 'Oda bulunamadı.');
        }

        const totalPeople = room.players.length + room.spectators.length;
        if (totalPeople >= MAX_ROOM_SIZE) {
            return socket.emit('joinError', 'Oda dolu (Maksimum 5 kişi).');
        }

        socket.join(roomCode);

        if (room.players.length < 2) {
            room.players.push(socket.id);
            console.log(`${socket.id} joined room ${roomCode} as a player.`);

            if (room.players.length === 2) {
                // Game is starting! Set the initial board state on the server.
                room.board = JSON.parse(JSON.stringify(INITIAL_BOARD)); // Deep copy
                room.turn = 'white';

                const [player1, player2] = room.players;
                io.to(player1).emit('gameStart', { color: 'white', room: roomCode, isSpectator: false, rules: room.rules });
                io.to(player2).emit('gameStart', { color: 'black', room: roomCode, isSpectator: false, rules: room.rules });
                console.log(`Game starting in room ${roomCode}.`);
            }
        } else { // Add as a spectator
            room.spectators.push(socket.id);
            console.log(`${socket.id} joined room ${roomCode} as a spectator.`);
            socket.emit('gameStart', { 
                room: roomCode, 
                isSpectator: true, 
                board: room.board, 
                turn: room.turn,
                rules: room.rules
            });
            io.to(roomCode).emit('spectatorUpdate', room.spectators.length);
        }
    });

    socket.on('move', (data) => {
        const room = rooms[data.room];
        if (room && room.players.includes(socket.id)) {
            room.board = data.board;
            room.turn = data.turn;
            socket.to(data.room).emit('opponentMove', data.move);
            console.log(`Move received in room ${data.room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                console.log(`Player ${socket.id} disconnected from room ${roomCode}. Game over.`);
                io.to(roomCode).emit('opponentDisconnected');
                delete rooms[roomCode];
                return;
            }

            const spectatorIndex = room.spectators.indexOf(socket.id);
            if (spectatorIndex !== -1) {
                room.spectators.splice(spectatorIndex, 1);
                console.log(`Spectator ${socket.id} left room ${roomCode}.`);
                io.to(roomCode).emit('spectatorUpdate', room.spectators.length);
                return;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
