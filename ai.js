import { gameSettings, board, turn, setIsPlayerTurn } from './state.js';
import { executeMove, getValidMoves, PIECE_VALUES } from './game.js';

export function makeAiMove() {
    const aiColor = gameSettings.playerColor === 'white' ? 'b' : 'w';
    const allMoves = getAllPossibleMoves(aiColor, board);

    if (allMoves.length === 0) {
        setIsPlayerTurn(true);
        return;
    }

    let bestMove;
    const movesToConsider = allMoves;

    if (gameSettings.difficulty === 'easy') {
        bestMove = movesToConsider[Math.floor(Math.random() * movesToConsider.length)];
    } else {
        bestMove = getBestAiMove(movesToConsider, gameSettings.difficulty);
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

function getBestAiMove(moves, difficulty) {
    let bestMove = null;
    let bestValue = -Infinity;

    for (const move of moves) {
        const tempBoard = board.map(row => [...row]);
        const targetPiece = tempBoard[move.to.r][move.to.c];
        tempBoard[move.to.r][move.to.c] = move.pieceId;
        tempBoard[move.from.r][move.from.c] = null;

        let moveValue = 0;
        if (targetPiece) {
            moveValue = PIECE_VALUES[targetPiece.substring(2)] || 0;
        }

        let opponentBestResponse = 0;
        if (difficulty === 'hard') {
            const opponentColor = turn === 'white' ? 'b' : 'w';
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
        }
        
        const finalValue = moveValue - opponentBestResponse;

        if (finalValue > bestValue) {
            bestValue = finalValue;
            bestMove = move;
        }
    }
    
    if (difficulty === 'medium') {
        let captureMoves = moves.filter(m => board[m.to.r][m.to.c] !== null);
        if (captureMoves.length > 0) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }
    }

    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}