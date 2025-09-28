import { isPlayerTurn, board, turn, gameSettings } from './state.js';
import { getValidMoves, handleLocalMove, isValidMove } from './game.js';
import { highlightValidMoves, clearHighlights } from './ui.js';

let selectedPiece = null;
let draggedElement = null;
let originalSquare = null;

export function handleMouseDown(e) {
    if (!isPlayerTurn || gameSettings.isSpectator) return;
    const pieceElement = e.target.closest('.piece');
    if (!pieceElement) return;

    originalSquare = pieceElement.parentElement;
    const row = parseInt(originalSquare.dataset.row);
    const col = parseInt(originalSquare.dataset.col);
    const pieceId = board[row][col];

    if (!pieceId || !pieceId.startsWith(turn.charAt(0))) return;
    if (gameSettings.mode === 'online' && !pieceId.startsWith(gameSettings.playerColor.charAt(0))) return;

    selectedPiece = { pieceId, row, col, validMoves: getValidMoves(pieceId, row, col, board) };
    
    draggedElement = pieceElement.cloneNode(true);
    draggedElement.classList.add('dragging-piece');
    document.body.appendChild(draggedElement);
    positionDraggedElement(e);

    pieceElement.classList.add('piece-hidden');
    highlightValidMoves(selectedPiece);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    if (draggedElement) positionDraggedElement(e);
}

function handleMouseUp(e) {
    if (!draggedElement) return;

    const targetSquare = getSquareFromCoordinates(e.clientX, e.clientY);
    
    if (targetSquare) {
        const toRow = parseInt(targetSquare.dataset.row);
        const toCol = parseInt(targetSquare.dataset.col);
        if (isValidMove(selectedPiece, toRow, toCol)) {
            handleLocalMove(selectedPiece.row, selectedPiece.col, toRow, toCol);
        }
    }

    document.body.removeChild(draggedElement);
    originalSquare.querySelector('.piece')?.classList.remove('piece-hidden');
    clearHighlights();

    draggedElement = null;
    selectedPiece = null;
    originalSquare = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function positionDraggedElement(e) {
    draggedElement.style.left = `${e.clientX - draggedElement.offsetWidth / 2}px`;
    draggedElement.style.top = `${e.clientY - draggedElement.offsetHeight / 2}px`;
}

function getSquareFromCoordinates(x, y) {
    return document.elementsFromPoint(x, y).find(el => el.classList.contains('square'));
}