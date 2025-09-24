document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chessboard = document.getElementById('chessboard');
    const turnInfo = document.getElementById('turn-info');
    const statusMessage = document.getElementById('status-message');
    const gameSetupModal = document.getElementById('game-setup-modal');
    const gameContainer = document.getElementById('game-container');

    // Modal Screens
    const welcomeMessage = document.getElementById('welcome-message');
    const modeSelection = document.getElementById('mode-selection');
    const difficultySelection = document.getElementById('difficulty-selection');
    const colorSelection = document.getElementById('color-selection');
    const kingCaptureConfirm = document.getElementById('king-capture-confirm');
    const gameOverMessage = document.getElementById('game-over-message');

    // Buttons
    const startSetupBtn = document.getElementById('start-setup-btn');
    const vsAiBtn = document.getElementById('vs-ai');
    const vsFriendBtn = document.getElementById('vs-friend');
    const confirmKingCaptureYesBtn = document.getElementById('confirm-king-capture-yes');
    const confirmKingCaptureNoBtn = document.getElementById('confirm-king-capture-no');
    const newGameBtn = document.getElementById('new-game-btn');
    const winnerText = document.getElementById('winner-text');

    // Game State & Settings
    const PIECES = {
        'w_pawn': '♙', 'w_rook': '♖', 'w_knight': '♘', 'w_bishop': '♗', 'w_queen': '♕', 'w_king': '♔',
        'b_pawn': '♟', 'b_rook': '♜', 'b_knight': '♞', 'b_bishop': '♝', 'b_queen': '♛', 'b_king': '♚'
    };
    const PIECE_VALUES = { 'pawn': 1, 'knight': 3, 'bishop': 3, 'rook': 5, 'queen': 9, 'king': 100 };

    let board = [];
    let turn = 'white';
    let selectedPiece = null;
    let validMoves = [];
    let gameSettings = { mode: null, difficulty: null, playerColor: null };
    let isPlayerTurn = true;
    let pendingMove = null;

    // --- GAME FLOW & SETUP --- //

    function init() {
        // Show welcome message first
        gameSetupModal.classList.remove('hidden');
        welcomeMessage.classList.remove('hidden');

        startSetupBtn.addEventListener('click', () => {
            welcomeMessage.classList.add('hidden');
            modeSelection.classList.remove('hidden');
        });

        vsAiBtn.addEventListener('click', () => {
            gameSettings.mode = 'ai';
            modeSelection.classList.add('hidden');
            difficultySelection.classList.remove('hidden');
        });

        vsFriendBtn.addEventListener('click', () => {
            gameSettings.mode = 'friend';
            // No need to select difficulty or color for friend mode
            startGame();
        });

        difficultySelection.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                gameSettings.difficulty = e.target.dataset.difficulty;
                difficultySelection.classList.add('hidden');
                colorSelection.classList.remove('hidden');
            });
        });

        colorSelection.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                gameSettings.playerColor = e.target.dataset.color;
                startGame();
            });
        });

        confirmKingCaptureYesBtn.addEventListener('click', () => {
            if (pendingMove) {
                kingCaptureConfirm.classList.add('hidden');
                executeMove(pendingMove.fromRow, pendingMove.fromCol, pendingMove.toRow, pendingMove.toCol);
                pendingMove = null;
            }
        });

        confirmKingCaptureNoBtn.addEventListener('click', () => {
            pendingMove = null;
            kingCaptureConfirm.classList.add('hidden');
            gameSetupModal.classList.add('hidden');
        });

        newGameBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    function startGame() {
        gameSetupModal.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        initializeBoard();
        renderBoard();

        if (gameSettings.mode === 'ai' && gameSettings.playerColor !== 'white') {
            isPlayerTurn = false;
            setTimeout(makeAiMove, 500);
        }
    }

    function endGame(winnerColor) {
        const winner = winnerColor === 'white' ? 'Beyaz' : 'Siyah';
        winnerText.innerText = `${winner} Kazandı!`;
        
        // Hide all other modal content
        const modalContents = document.querySelectorAll('.modal-content > div');
        modalContents.forEach(el => el.classList.add('hidden'));

        // Show game over message
        gameSetupModal.classList.remove('hidden');
        gameOverMessage.classList.remove('hidden');
        isPlayerTurn = false;
    }

    // --- BOARD LOGIC --- //

    function initializeBoard() {
        board = [
            ['b_rook', 'b_knight', 'b_bishop', 'b_queen', 'b_king', 'b_bishop', 'b_knight', 'b_rook'],
            ['b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn'],
            ['w_rook', 'w_knight', 'w_bishop', 'w_queen', 'w_king', 'w_bishop', 'w_knight', 'w_rook']
        ];
    }

    function renderBoard() {
        chessboard.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = r;
                square.dataset.col = c;

                const pieceId = board[r][c];
                if (pieceId) {
                    const pieceColor = pieceId.charAt(0);
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece', pieceColor);
                    pieceElement.innerText = PIECES[pieceId];
                    pieceElement.dataset.piece = pieceId;
                    square.appendChild(pieceElement);
                }
                chessboard.appendChild(square);
            }
        }
        addSquareListeners();
        updateTurnInfo();
    }

    function addSquareListeners() {
        document.querySelectorAll('.square').forEach(square => {
            square.addEventListener('click', handleSquareClick);
        });
    }

    function handleSquareClick(e) {
        if (!isPlayerTurn) return;

        const square = e.target.closest('.square');
        if (!square) return;

        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);

        if (selectedPiece && isValidMove(row, col)) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
            return;
        }

        clearHighlights();

        const pieceId = board[row][col];
        const currentTurnColor = turn.charAt(0);
        if (pieceId && pieceId.startsWith(currentTurnColor)) {
            selectedPiece = { pieceId, row, col };
            validMoves = getValidMoves(pieceId, row, col);
            square.classList.add('selected');
            highlightValidMoves();
        } else {
            selectedPiece = null;
            validMoves = [];
        }
    }

    function movePiece(fromRow, fromCol, toRow, toCol) {
        const movingPieceId = board[fromRow][fromCol];
        const targetPieceId = board[toRow][toCol];

        if (movingPieceId && movingPieceId.endsWith('king') && targetPieceId) {
            pendingMove = { fromRow, fromCol, toRow, toCol };
            gameSetupModal.classList.remove('hidden');
            kingCaptureConfirm.classList.remove('hidden');
            return;
        }

        executeMove(fromRow, fromCol, toRow, toCol);
    }

    function executeMove(fromRow, fromCol, toRow, toCol) {
        const movingPieceId = board[fromRow][fromCol];
        const targetPieceId = board[toRow][toCol];
        let newPieceId = movingPieceId;

        if (targetPieceId) {
            const capturedType = targetPieceId.substring(2);
            const movingColor = movingPieceId.substring(0, 2);
            newPieceId = movingColor + capturedType;
            statusMessage.innerText = `${PIECES[movingPieceId]} ${PIECES[targetPieceId]}'ı yedi ve ${PIECES[newPieceId]}'e dönüştü!`
        } else {
            statusMessage.innerText = '';
        }

        board[toRow][toCol] = newPieceId;
        board[fromRow][fromCol] = null;

        if (newPieceId && newPieceId.endsWith('pawn') && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol] = newPieceId.replace('pawn', 'queen');
            statusMessage.innerText = `Piyon terfi etti!`
        }

        if (targetPieceId && targetPieceId.endsWith('king')) {
            endGame(turn);
            return;
        }

        selectedPiece = null;
        validMoves = [];
        turn = turn === 'white' ? 'black' : 'white';
        
        renderBoard();

        if (gameSettings.mode === 'ai' && turn.charAt(0) !== gameSettings.playerColor.charAt(0)) {
            isPlayerTurn = false;
            setTimeout(makeAiMove, 500);
        }
    }

    // --- MOVE VALIDATION & UI --- //

    function getValidMoves(pieceId, r, c) {
        const [color, type] = pieceId.split('_');
        const moves = [];
        const opponentColor = color === 'w' ? 'b' : 'w';

        const addMove = (endR, endC) => {
            if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
                const target = board[endR][endC];
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
                if (r + dir >= 0 && r + dir < 8 && board[r + dir][c] === null) {
                    moves.push({ r: r + dir, c: c });
                    if (r === startRow && board[r + 2 * dir][c] === null) {
                        moves.push({ r: r + 2 * dir, c: c });
                    }
                }
                [-1, 1].forEach(side => {
                    const newC = c + side;
                    if (newC >= 0 && newC < 8) {
                        const target = board[r + dir]?.[newC];
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

    function isValidMove(row, col) {
        return validMoves.some(move => move.r === row && move.c === col);
    }

    function clearHighlights() {
        document.querySelectorAll('.selected, .valid-move').forEach(el => el.classList.remove('selected', 'valid-move'));
    }

    function highlightValidMoves() {
        validMoves.forEach(move => {
            document.querySelector(`[data-row='${move.r}'][data-col='${move.c}']`)?.classList.add('valid-move');
        });
    }

    function updateTurnInfo() {
        turnInfo.innerText = turn === 'white' ? 'Beyazın Sırası' : 'Siyahın Sırası';
    }

    // --- AI LOGIC --- //

    function makeAiMove() {
        const aiColor = gameSettings.playerColor === 'white' ? 'b' : 'w';
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const pieceId = board[r][c];
                if (pieceId && pieceId.startsWith(aiColor)) {
                    const moves = getValidMoves(pieceId, r, c);
                    moves.forEach(move => allMoves.push({ from: { r, c, pieceId }, to: move }));
                }
            }
        }

        if (allMoves.length === 0) {
            isPlayerTurn = true;
            return;
        }

        let bestMove;
        const nonSuicidalMoves = allMoves.filter(move => {
            const isKingMove = move.from.pieceId.endsWith('king');
            const isCapture = board[move.to.r][move.to.c] !== null;
            return !isKingMove || !isCapture;
        });

        const movesToConsider = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : allMoves;

        if (gameSettings.difficulty === 'easy') {
            bestMove = movesToConsider[Math.floor(Math.random() * movesToConsider.length)];
        } else {
            bestMove = getBestEvaluatedMove(movesToConsider, gameSettings.difficulty);
        }

        if (bestMove) {
            executeMove(bestMove.from.r, bestMove.from.c, bestMove.to.r, bestMove.to.c);
        }
        isPlayerTurn = true;
    }

    function getBestEvaluatedMove(moves, difficulty) {
        let bestMove = null;
        let bestValue = -Infinity;
        let potentialMoves = [];

        for (const move of moves) {
            const targetPiece = board[move.to.r][move.to.c];
            let moveValue = 0;

            if (targetPiece) {
                moveValue = PIECE_VALUES[targetPiece.substring(2)] || 0;
            }

            if (difficulty === 'hard') {
                const centerDistance = Math.abs(3.5 - move.to.r) + Math.abs(3.5 - move.to.c);
                moveValue += (14 - centerDistance) * 0.01;
            }

            if (moveValue > bestValue) {
                bestValue = moveValue;
                potentialMoves = [move];
            } else if (moveValue === bestValue) {
                potentialMoves.push(move);
            }
        }

        if (difficulty === 'medium' && bestValue === 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        
        return potentialMoves[Math.floor(Math.random() * potentialMoves.length)] || moves[Math.floor(Math.random() * moves.length)];
    }

    // --- INITIALIZE --- //
    init();
});