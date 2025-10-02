
import { setGameSettings, setSocket, setIsPlayerTurn, gameSettings, setBoard, setTurn } from './state.js';
import { roomCodeDisplay, roomCreatedScreen, joinErrorMsg, updateSpectatorCount } from './ui.js';
import { startGame, executeMove, endGame } from './game.js';

export function connectOnline() {
    const socket = io();
    setSocket(socket);

    socket.on('roomCreated', (roomCode) => {
        roomCodeDisplay.innerText = roomCode;
        roomCreatedScreen.classList.remove('hidden');
    });

    socket.on('joinError', (message) => {
        joinErrorMsg.innerText = message;
    });

    socket.on('gameStart', (data) => {
        setGameSettings({ 
            room: data.room,
            playerColor: data.color,
            isSpectator: data.isSpectator,
            rules: data.rules // Make sure rules are set from server
        });

        // Announce to the UI that it's time to show the game board
        document.dispatchEvent(new CustomEvent('showGameScreen'));

        if (data.isSpectator) {
            setBoard(data.board);
            setTurn(data.turn);
        }
        setIsPlayerTurn(data.color === 'white' && !data.isSpectator);
        startGame();
    });

    socket.on('opponentMove', (move) => {
        executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, false);
        setIsPlayerTurn(true);
    });

    socket.on('opponentDisconnected', () => {
        endGame(gameSettings.playerColor, 'opponentDisconnected');
    });

    socket.on('spectatorUpdate', (count) => {
        updateSpectatorCount(count);
    });
}
