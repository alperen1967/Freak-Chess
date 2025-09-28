
import { renderBoard, logMove, statusMessage, winnerText, gameSetupModal, gameOverModal, PIECES, gameContainer } from './ui.js';
import { makeAiMove } from './ai.js';
import { board, turn, gameSettings, socket, setBoard, setTurn, setPendingMove, setIsPlayerTurn } from './state.js';

export const PIECE_VALUES = { 'pawn': 1, 'knight': 3, 'bishop': 3, 'rook': 5, 'queen': 9, 'king': 1000 };
let aiMoveTimeoutId = null;

export function initializeBoard() {
    const newBoard = [
        ['b_rook', 'b_knight', 'b_bishop', 'b_queen', 'b_king', 'b_bishop', 'b_knight', 'b_rook'],
        ['b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn'],
        ...Array.from({ length: 4 }, () => Array(8).fill(null)),
        ['w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn'],
        ['w_rook', 'w_knight', 'w_bishop', 'w_queen', 'w_king', 'w_bishop', 'w_knight', 'w_rook']
    ];
    setBoard(newBoard);
}

export function startGame() {
    if (!gameSettings.isSpectator) {
        initializeBoard();
    }
    renderBoard(board, turn, gameSettings, findKing, isSquareAttacked);

    if (gameSettings.mode === 'ai' && gameSettings.playerColor !== 'white') {
        setIsPlayerTurn(false);
        aiMoveTimeoutId = setTimeout(makeAiMove, 500);
    }
}

export function endGame(winnerColor, reason) {
    let winnerName = winnerColor === 'white' ? 'Beyaz' : 'Siyah';

    let message = '';
    if (reason === 'checkmate') {
        message = `Şah Mat! ${winnerName} kazandı!`;
    } else if (reason === 'stalemate') {
        message = 'Pat! Oyun berabere.';
    } else if (reason === 'opponentDisconnected') {
        message = 'Rakibin bağlantısı kesildi. Kazandınız!';
    } else { // King capture
        message = `${winnerName} kazandı!`;
    }
    winnerText.innerText = message;
    
    gameOverModal.classList.remove('hidden');
    if (aiMoveTimeoutId) clearTimeout(aiMoveTimeoutId);
    setIsPlayerTurn(false);
}

export function handleLocalMove(fromRow, fromCol, toRow, toCol) {
    const movingPieceId = board[fromRow][fromCol];
    const targetPieceId = board[toRow][toCol];

    if (gameSettings.rules === 'kingCapture' && movingPieceId.endsWith('_king') && targetPieceId) {
        setPendingMove({ fromRow, fromCol, toRow, toCol });
        kingCaptureConfirm.parentElement.parentElement.classList.remove('hidden');
        kingCaptureConfirm.classList.remove('hidden');
        return;
    }

    if (gameSettings.mode === 'online') {
        setIsPlayerTurn(false);
    }
    
    executeMove(fromRow, fromCol, toRow, toCol, true);
}

export function executeMove(fromRow, fromCol, toRow, toCol, isLocalMove) {
    const movingPieceId = board[fromRow][fromCol];
    const targetPieceId = board[toRow][toCol];

    const isKingCaptureRule = (gameSettings.rules === 'kingCapture');
    const isTargetKing = (targetPieceId !== null && typeof targetPieceId === 'string' && targetPieceId.endsWith('king'));

    if (isKingCaptureRule && isTargetKing) {
        // The board state won't be visually updated, but the game will end.
        // This is to ensure no other function call interferes with endGame.
        endGame(turn, 'kingCapture');
        return;
    }

    // --- Normal Move Logic ---
    logMove(fromRow, fromCol, toRow, toCol, movingPieceId, targetPieceId, turn);
    
    let newPieceId = movingPieceId;

    if (targetPieceId && !movingPieceId.endsWith('_king')) {
        const capturedType = targetPieceId.substring(2);
        const movingColor = movingPieceId.substring(0, 2);
        newPieceId = movingColor + capturedType;
        statusMessage.innerText = `${PIECES[movingPieceId]} ${PIECES[targetPieceId]}'ı yedi ve ${PIECES[newPieceId]}'e dönüştü!`;
    } else if (targetPieceId) {
        statusMessage.innerText = 'Taş alındı!';
    } else {
        statusMessage.innerText = '';
    }

    const newBoard = board.map(row => [...row]);
    newBoard[toRow][toCol] = newPieceId;
    newBoard[fromRow][fromCol] = null;

    if (newPieceId?.endsWith('pawn') && (toRow === 0 || toRow === 7)) {
        newBoard[toRow][toCol] = newPieceId.replace('pawn', 'queen');
        statusMessage.innerText = `Piyon terfi etti!`
    }
    setBoard(newBoard);

    const newTurn = turn === 'white' ? 'black' : 'white';
    setTurn(newTurn);
    renderBoard(board, newTurn, gameSettings, findKing, isSquareAttacked);

    if (isLocalMove && gameSettings.mode === 'online') {
        socket.emit('move', { 
            room: gameSettings.room, 
            move: { fromRow, fromCol, toRow, toCol },
            board: board, 
            turn: newTurn 
        });
    }

    if (gameSettings.rules === 'traditional') {
        const gameStatus = getGameStatus(newTurn, board);
        if (gameStatus !== 'ongoing') {
            endGame(turn === 'white' ? 'black' : 'white', gameStatus);
            return;
        }
    }

    if (isLocalMove && gameSettings.mode === 'ai' && newTurn.charAt(0) !== gameSettings.playerColor.charAt(0)) {
        setIsPlayerTurn(false);
        aiMoveTimeoutId = setTimeout(makeAiMove, 500);
    }
}

function getPseudoLegalMoves(pieceId, r, c, currentBoard) {
    const [color, type] = pieceId.split('_');
    const moves = [];
    const opponentColor = color === 'w' ? 'b' : 'w';

    const addMove = (endR, endC) => {
        if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
            const target = currentBoard[endR][endC];
            if (target === null) {
                moves.push({ r: endR, c: endC });
                return true; 
            } else if (target.startsWith(opponentColor)) {
                moves.push({ r: endR, c: endC });
                return false; 
            }
        }
        return false; 
    };

    const addSlidingMoves = (directions) => {
        for (const [dr, dc] of directions) {
            let currentR = r + dr;
            let currentC = c + dc;
            while (addMove(currentR, currentC)) {
                currentR += dr;
                currentC += dc;
            }
        }
    };

    switch (type) {
        case 'pawn':
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            if (r + dir >= 0 && r + dir < 8 && currentBoard[r + dir][c] === null) {
                moves.push({ r: r + dir, c: c });
                if (r === startRow && currentBoard[r + 2 * dir][c] === null) {
                    moves.push({ r: r + 2 * dir, c: c });
                }
            }
            [-1, 1].forEach(side => {
                const newC = c + side;
                if (newC >= 0 && newC < 8) {
                    const target = currentBoard[r + dir]?.[newC];
                    if (target && target.startsWith(opponentColor)) {
                        moves.push({ r: r + dir, c: newC });
                    }
                }
            });
            break;
        case 'knight':
            const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            knightMoves.forEach(([dr, dc]) => addMove(r + dr, c + dc));
            break;
        case 'king':
            const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            kingMoves.forEach(([dr, dc]) => addMove(r + dr, c + dc));
            break;
        case 'rook': addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]); break;
        case 'bishop': addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]); break;
        case 'queen': addSlidingMoves([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]); break;
    }
    return moves;
}

export function isSquareAttacked(r, c, attackerColor, currentBoard) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const pieceId = currentBoard[row][col];
            if (pieceId && pieceId.startsWith(attackerColor)) {
                const moves = getPseudoLegalMoves(pieceId, row, col, currentBoard);
                if (moves.some(move => move.r === r && move.c === c)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function findKing(kingColor, currentBoard) {
    const kingPieceId = kingColor.charAt(0) + '_king';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (currentBoard[r][c] === kingPieceId) {
                return { r, c };
            }
        }
    }
    return null; 
}

export function getValidMoves(pieceId, r, c, currentBoard) {
    const pseudoMoves = getPseudoLegalMoves(pieceId, r, c, currentBoard);
    if (gameSettings.rules === 'kingCapture') {
        return pseudoMoves;
    }

    const kingColor = pieceId.charAt(0) === 'w' ? 'white' : 'black';
    const validMoves = [];
    for (const move of pseudoMoves) {
        const tempBoard = currentBoard.map(row => [...row]);
        tempBoard[move.r][move.c] = pieceId;
        tempBoard[r][c] = null;
        const kingPos = findKing(kingColor, tempBoard);
        if (kingPos && !isSquareAttacked(kingPos.r, kingPos.c, kingColor === 'white' ? 'b' : 'w', tempBoard)) {
            validMoves.push(move);
        }
    }
    return validMoves;
}

function getGameStatus(playerColor, currentBoard) {
    const kingPos = findKing(playerColor, currentBoard);
    if (!kingPos) return 'ongoing';

    const opponentColor = playerColor === 'white' ? 'b' : 'w';
    const inCheck = isSquareAttacked(kingPos.r, kingPos.c, opponentColor, currentBoard);

    let hasLegalMoves = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const pieceId = currentBoard[r][c];
            if (pieceId && pieceId.startsWith(playerColor.charAt(0))) {
                const moves = getValidMoves(pieceId, r, c, currentBoard);
                if (moves.length > 0) {
                    hasLegalMoves = true;
                    break;
                }
            }
        }
        if (hasLegalMoves) break;
    }

    if (!hasLegalMoves) {
        return inCheck ? 'checkmate' : 'stalemate';
    }

    return 'ongoing';
}

export function isValidMove(selectedPiece, row, col) {
    return selectedPiece?.validMoves.some(move => move.r === row && move.c === col);
}
