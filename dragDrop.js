import { isPlayerTurn, board, turn, gameSettings } from './state.js';
import { getValidMoves, handleLocalMove, isValidMove } from './game.js';
import { highlightValidMoves, clearHighlights } from './ui.js';

let selectedPiece = null;
let draggedElement = null;
let originalSquare = null;

// Universal event handler for starting a drag
export function handleDragStart(e) {
    // Prevent page scrolling on touch devices
    if (e.type === 'touchstart') {
        e.preventDefault();
    }

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
    
    const coords = getEventCoordinates(e);
    positionDraggedElement(coords);

    pieceElement.classList.add('piece-hidden');
    highlightValidMoves(selectedPiece);

    // Add universal move and end listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
}

// Universal event handler for moving the piece
function handleDragMove(e) {
    if (draggedElement) {
        const coords = getEventCoordinates(e);
        positionDraggedElement(coords);
    }
}

// Universal event handler for ending a drag
function handleDragEnd(e) {
    if (!draggedElement) return;

    const coords = getEventCoordinates(e);
    // For touchend, the coordinates are in changedTouches
    const endCoords = e.type === 'touchend' ? e.changedTouches[0] : coords;

    const targetSquare = getSquareFromCoordinates(endCoords.clientX, endCoords.clientY);
    
    if (targetSquare) {
        const toRow = parseInt(targetSquare.dataset.row);
        const toCol = parseInt(targetSquare.dataset.col);
        if (isValidMove(selectedPiece, toRow, toCol)) {
            handleLocalMove(selectedPiece.row, selectedPiece.col, toRow, toCol);
        }
    }

    // Cleanup
    document.body.removeChild(draggedElement);
    originalSquare.querySelector('.piece')?.classList.remove('piece-hidden');
    clearHighlights();

    draggedElement = null;
    selectedPiece = null;
    originalSquare = null;
    
    // Remove universal listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);
}

// --- Helper Functions ---

// Gets coordinates from either a mouse or touch event
function getEventCoordinates(e) {
    return e.touches ? e.touches[0] : e;
}

function positionDraggedElement(coords) {
    draggedElement.style.left = `${coords.clientX - draggedElement.offsetWidth / 2}px`;
    draggedElement.style.top = `${coords.clientY - draggedElement.offsetHeight / 2}px`;
}

function getSquareFromCoordinates(x, y) {
    // Hide the dragged piece so it doesn't block the elementFromPoint check
    draggedElement.style.display = 'none';
    const element = document.elementFromPoint(x, y);
    // Show it again
    draggedElement.style.display = '';
    return element?.closest('.square');
}
