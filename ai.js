import { gameSettings, board, turn, setIsPlayerTurn } from './state.js';
import { executeMove, getValidMoves, PIECE_VALUES, isSquareAttacked } from './game.js';

export function makeAiMove() {
    const aiColor = gameSettings.playerColor === 'white' ? 'b' : 'w';
    const allMoves = getAllPossibleMoves(aiColor, board);

    if (allMoves.length === 0) {
        setIsPlayerTurn(true);
        return;
    }

    let bestMove;
    if (gameSettings.difficulty === 'easy') {
        bestMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    } else {
        bestMove = getBestAiMove(allMoves, aiColor, gameSettings.difficulty);
    }

    if (bestMove) {
        executeMove(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c, true);
    }
    setIsPlayerTurn(true);
}

function getAllPossibleMoves(color, currentBoard) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const pieceId = currentBoard[r][c];
            if (pieceId && pieceId.startsWith(color)) {
                const moves = getValidMoves(pieceId, r, c, currentBoard);
                moves.forEach(move => allMoves.push({ from: { r, c }, to: move, pieceId }));
            }
        }
    }
    return allMoves;
}

function getBestAiMove(moves, aiColor, difficulty) {
    const opponentColor = aiColor === 'w' ? 'b' : 'w';

    if (difficulty === 'medium') {
        let bestCaptureValue = -1;
        let bestCaptureMove = null;
        for (const move of moves) {
            const targetPiece = board[move.to.r][move.to.c];
            if (targetPiece) {
                const captureValue = PIECE_VALUES[targetPiece.substring(2)] || 0;
                if (captureValue > bestCaptureValue) {
                    bestCaptureValue = captureValue;
                    bestCaptureMove = move;
                }
            }
        }
        if (bestCaptureMove) {
            return bestCaptureMove;
        }
        // If no captures, make a random move
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // --- Hard Difficulty Logic ---
    let bestMove = null;
    let bestValue = -Infinity;

    for (const move of moves) {
        const tempBoard = board.map(row => [...row]);
        const capturedPiece = tempBoard[move.to.r][move.to.c];
        tempBoard[move.to.r][move.to.c] = move.pieceId;
        tempBoard[move.from.r][move.from.c] = null;

        let moveValue = 0;

        // 1. Value of captured piece
        if (capturedPiece) {
            moveValue += PIECE_VALUES[capturedPiece.substring(2)] || 0;
        }

        // 2. Positional bonus for center control (very small bonus)
        const centerSquares = { '3,3': 1, '3,4': 1, '4,3': 1, '4,4': 1 };
        if (`${move.to.r},${move.to.c}` in centerSquares) {
            moveValue += 0.1;
        }

        // 3. Penalty for moving into an attacked square
        if (isSquareAttacked(move.to.r, move.to.c, opponentColor, tempBoard)) {
            moveValue -= (PIECE_VALUES[move.pieceId.substring(2)] / 2) || 0;
        }

        // 4. Minimax: Look ahead one ply for opponent's best response
        let opponentBestResponse = 0;
        const opponentMoves = getAllPossibleMoves(opponentColor, tempBoard);
        for (const oppMove of opponentMoves) {
            const oppTarget = tempBoard[oppMove.to.r][oppMove.to.c];
            if (oppTarget) {
                const value = PIECE_VALUES[oppTarget.substring(2)] || 0;
                if (value > opponentBestResponse) {
                    opponentBestResponse = value;
                }
            }
        }
        
        const finalValue = moveValue - opponentBestResponse;

        if (finalValue > bestValue) {
            bestValue = finalValue;
            bestMove = move;
        }
    }

    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}
