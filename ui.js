export const PIECES = {
    'w_pawn': '♙', 'w_rook': '♖', 'w_knight': '♘', 'w_bishop': '♗', 'w_queen': '♕', 'w_king': '♔',
    'b_pawn': '♟', 'b_rook': '♜', 'b_knight': '♞', 'b_bishop': '♝', 'b_queen': '♛', 'b_king': '♚'
};

export const chessboard = document.getElementById('chessboard');
export const turnInfo = document.getElementById('turn-info');
export const statusMessage = document.getElementById('status-message');
export const gameSetupModal = document.getElementById('game-setup-modal');
export const gameContainer = document.getElementById('game-container');
export const moveList = document.getElementById('move-list');
export const welcomeMessage = document.getElementById('welcome-message');
export const rulesSelection = document.getElementById('rules-selection');
export const modeSelection = document.getElementById('mode-selection');
export const difficultySelection = document.getElementById('difficulty-selection');
export const colorSelection = document.getElementById('color-selection');
export const kingCaptureConfirm = document.getElementById('king-capture-confirm');
export const gameOverModal = document.getElementById('game-over-modal');
export const onlineMenu = document.getElementById('online-menu');
export const roomCreatedScreen = document.getElementById('room-created-screen');
export const joinRoomScreen = document.getElementById('join-room-screen');
export const startSetupBtn = document.getElementById('start-setup-btn');
export const kingCaptureModeBtn = document.getElementById('king-capture-mode-btn');
export const traditionalModeBtn = document.getElementById('traditional-mode-btn');
export const vsAiBtn = document.getElementById('vs-ai');
export const vsFriendBtn = document.getElementById('vs-friend');
export const vsOnlineBtn = document.getElementById('vs-online');
export const createRoomBtn = document.getElementById('create-room-btn');
export const joinRoomBtn = document.getElementById('join-room-btn');
export const roomCodeDisplay = document.getElementById('room-code-display');
export const roomCodeInput = document.getElementById('room-code-input');
export const submitJoinBtn = document.getElementById('submit-join-btn');
export const joinErrorMsg = document.getElementById('join-error-msg');
export const confirmKingCaptureYesBtn = document.getElementById('confirm-king-capture-yes');
export const confirmKingCaptureNoBtn = document.getElementById('confirm-king-capture-no');
export const restartSameModeBtn = document.getElementById('restart-same-mode-btn');
export const changeModeBtn = document.getElementById('change-mode-btn');
export const winnerText = document.getElementById('winner-text');
export const spectatorInfo = document.getElementById('spectator-info');
export const spectatorCount = document.getElementById('spectator-count');

// New UI Elements
export const loginScreen = document.getElementById('login-screen');
export const usernameInput = document.getElementById('username-input');
export const loginProceedBtn = document.getElementById('login-proceed-btn');
export const newGameSetupScreen = document.getElementById('new-game-setup-screen');
export const rulesGroup = document.getElementById('rules-group');
export const modeGroup = document.getElementById('mode-group');
export const difficultySection = document.getElementById('difficulty-section');
export const difficultyGroup = document.getElementById('difficulty-group');
export const startGameBtn = document.getElementById('start-game-btn');
export const createRoomBtnNew = document.getElementById('create-room-btn-new');
export const joinRoomBtnNew = document.getElementById('join-room-btn-new');

let moveCount = 0;

export function renderBoard(board, turn, gameSettings, findKing, isSquareAttacked) {
    chessboard.innerHTML = '';
    const kingInCheck = (gameSettings.rules === 'traditional') ? findKing(turn, board) : null;
    const isCheck = kingInCheck ? isSquareAttacked(kingInCheck.r, kingInCheck.c, turn === 'white' ? 'b' : 'w', board) : false;

    const isFlipped = gameSettings.playerColor === 'black';

    for (let r_idx = 0; r_idx < 8; r_idx++) {
        for (let c_idx = 0; c_idx < 8; c_idx++) {
            const r = isFlipped ? 7 - r_idx : r_idx;
            const c = isFlipped ? 7 - c_idx : c_idx;

            const square = document.createElement('div');
            square.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = r;
            square.dataset.col = c;

            if (isCheck && kingInCheck.r === r && kingInCheck.c === c) {
                square.classList.add('check');
            }

            const pieceId = board[r][c];
            if (pieceId) {
                const pieceColor = pieceId.charAt(0);
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', pieceColor);
                pieceElement.innerText = PIECES[pieceId];
                square.appendChild(pieceElement);
            }
            chessboard.appendChild(square);
        }
    }
    updateTurnInfo(turn, gameSettings);
}

export function updateTurnInfo(turn, gameSettings) {
    turnInfo.innerText = turn === 'white' ? 'Beyazın Sırası' : 'Siyahın Sırası';
    if (gameSettings.mode === 'online') {
        if (gameSettings.isSpectator) {
            turnInfo.innerText += ' (İzleyici)';
        } else {
            const myTurn = (turn.charAt(0) === gameSettings.playerColor.charAt(0));
            turnInfo.innerText += myTurn ? ' (Siz)' : ' (Rakip)';
        }
    }
}

export function clearHighlights() {
    document.querySelectorAll('.valid-move, .check').forEach(el => el.classList.remove('valid-move', 'check'));
}

export function highlightValidMoves(selectedPiece) {
    selectedPiece?.validMoves.forEach(move => {
        document.querySelector(`[data-row='${move.r}'][data-col='${move.c}']`)?.classList.add('valid-move');
    });
}

export function logMove(fromRow, fromCol, toRow, toCol, pieceId, targetId, turn) {
    if (!pieceId) return;
    const moveNotation = getAlgebraicNotation(fromRow, fromCol, toRow, toCol, pieceId, targetId);
    if (turn === 'white') {
        moveCount++;
        const newRow = document.createElement('div');
        newRow.classList.add('move-row');
        newRow.innerHTML = `<span class="move-number">${moveCount}.</span><span class="move-white">${moveNotation}</span>`;
        moveList.appendChild(newRow);
    } else {
        const lastRow = moveList.lastChild;
        if(lastRow) {
            lastRow.innerHTML += `<span class="move-black">${moveNotation}</span>`;
        }
    }
    moveList.scrollTop = moveList.scrollHeight;
}

function getAlgebraicNotation(fromRow, fromCol, toRow, toCol, pieceId, targetId) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const pieceType = pieceId.substring(2);
    const pieceMap = { pawn: '', knight: 'A', bishop: 'F', rook: 'K', queen: 'V', king: 'Ş' };
    let notation = pieceMap[pieceType];

    if (targetId) {
        if (pieceType === 'pawn') {
            notation += files[fromCol];
        }
        notation += 'x';
    }

    notation += files[toCol] + (8 - toRow);
    return notation;
}

export function updateSpectatorCount(count) {
    if (count > 0) {
        spectatorInfo.classList.remove('hidden');
        spectatorCount.innerText = count;
    } else {
        spectatorInfo.classList.add('hidden');
    }
}