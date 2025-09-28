
export let board = [];
export let turn = 'white';
export let gameSettings = { rules: 'kingCapture', mode: null, difficulty: null, playerColor: null, room: null, isSpectator: false };
export let isPlayerTurn = true;
export let pendingMove = null;
export let socket;

export function setBoard(newBoard) {
    board = newBoard;
}

export function setTurn(newTurn) {
    turn = newTurn;
}

export function setGameSettings(settings) {
    gameSettings = { ...gameSettings, ...settings };
}

export function setIsPlayerTurn(value) {
    isPlayerTurn = value;
}

export function setPendingMove(move) {
    pendingMove = move;
}

export function setSocket(newSocket) {
    socket = newSocket;
}
