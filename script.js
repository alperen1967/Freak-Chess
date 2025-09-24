document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chessboard = document.getElementById('chessboard');
    const turnInfo = document.getElementById('turn-info');
    const statusMessage = document.getElementById('status-message');
    const gameSetupModal = document.getElementById('game-setup-modal');
    const gameContainer = document.getElementById('game-container');
    const moveList = document.getElementById('move-list');

    // --- Modal Screens & Buttons ---
    const welcomeMessage = document.getElementById('welcome-message');
    const rulesSelection = document.getElementById('rules-selection');
    const modeSelection = document.getElementById('mode-selection');
    const difficultySelection = document.getElementById('difficulty-selection');
    const colorSelection = document.getElementById('color-selection');
    const kingCaptureConfirm = document.getElementById('king-capture-confirm');
    const gameOverMessage = document.getElementById('game-over-message');
    const onlineMenu = document.getElementById('online-menu');
    const roomCreatedScreen = document.getElementById('room-created-screen');
    const joinRoomScreen = document.getElementById('join-room-screen');
    const startSetupBtn = document.getElementById('start-setup-btn');
    const kingCaptureModeBtn = document.getElementById('king-capture-mode-btn');
    const traditionalModeBtn = document.getElementById('traditional-mode-btn');
    const vsAiBtn = document.getElementById('vs-ai');
    const vsFriendBtn = document.getElementById('vs-friend');
    const vsOnlineBtn = document.getElementById('vs-online');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomCodeInput = document.getElementById('room-code-input');
    const submitJoinBtn = document.getElementById('submit-join-btn');
    const joinErrorMsg = document.getElementById('join-error-msg');
    const confirmKingCaptureYesBtn = document.getElementById('confirm-king-capture-yes');
    const confirmKingCaptureNoBtn = document.getElementById('confirm-king-capture-no');
    const newGameBtn = document.getElementById('new-game-btn');
    const winnerText = document.getElementById('winner-text');

    // --- Game State & Settings ---
    const PIECES = {
        'w_pawn': '♙', 'w_rook': '♖', 'w_knight': '♘', 'w_bishop': '♗', 'w_queen': '♕', 'w_king': '♔',
        'b_pawn': '♟', 'b_rook': '♜', 'b_knight': '♞', 'b_bishop': '♝', 'b_queen': '♛', 'b_king': '♚'
    };
    const PIECE_VALUES = { 'pawn': 1, 'knight': 3, 'bishop': 3, 'rook': 5, 'queen': 9, 'king': 1000 };

    let board = [];
    let turn = 'white';
    let moveCount = 0;
    let gameSettings = { rules: 'kingCapture', mode: null, difficulty: null, playerColor: null, room: null };
    let isPlayerTurn = true;
    let pendingMove = null;
    let socket;

    // Drag state
    let selectedPiece = null;
    let draggedElement = null;
    let originalSquare = null;

    // --- GAME FLOW & SETUP ---

    function init() {
        gameSetupModal.classList.remove('hidden');
        welcomeMessage.classList.remove('hidden');
        // Add both mouse and touch event listeners
        chessboard.addEventListener('mousedown', handleDragStart);
        chessboard.addEventListener('touchstart', handleDragStart, { passive: false });

        startSetupBtn.addEventListener('click', () => {
            welcomeMessage.classList.add('hidden');
            rulesSelection.classList.remove('hidden');
        });

        kingCaptureModeBtn.addEventListener('click', () => {
            gameSettings.rules = 'kingCapture';
            rulesSelection.classList.add('hidden');
            modeSelection.classList.remove('hidden');
        });

        traditionalModeBtn.addEventListener('click', () => {
            gameSettings.rules = 'traditional';
            rulesSelection.classList.add('hidden');
            modeSelection.classList.remove('hidden');
        });

        vsAiBtn.addEventListener('click', () => {
            gameSettings.mode = 'ai';
            modeSelection.classList.add('hidden');
            difficultySelection.classList.remove('hidden');
        });

        vsFriendBtn.addEventListener('click', () => {
            gameSettings.mode = 'friend';
            startGame();
        });

        vsOnlineBtn.addEventListener('click', () => {
            gameSettings.mode = 'online';
            modeSelection.classList.add('hidden');
            onlineMenu.classList.remove('hidden');
            connectOnline();
        });

        createRoomBtn.addEventListener('click', () => {
            onlineMenu.classList.add('hidden');
            socket.emit('createRoom');
        });

        joinRoomBtn.addEventListener('click', () => {
            onlineMenu.classList.add('hidden');
            joinRoomScreen.classList.remove('hidden');
        });

        submitJoinBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) {
                socket.emit('joinRoom', roomCode);
            }
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
                handleLocalMove(pendingMove.fromRow, pendingMove.fromCol, pendingMove.toRow, pendingMove.toCol);
                pendingMove = null;
            }
        });

        confirmKingCaptureNoBtn.addEventListener('click', () => {
            pendingMove = null;
            kingCaptureConfirm.classList.add('hidden');
            gameSetupModal.classList.add('hidden');
            clearHighlights();
        });

        newGameBtn.addEventListener('click', () => location.reload());
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

    function endGame(winnerColor, reason) {
        let message = '';
        if (reason === 'checkmate') {
            const winner = winnerColor === 'white' ? 'Beyaz' : 'Siyah';
            message = `Şah Mat! ${winner} kazandı.`;
        } else if (reason === 'stalemate') {
            message = 'Pat! Oyun berabere.';
        } else if (reason === 'opponentDisconnected') {
            message = 'Rakibin bağlantısı kesildi. Kazandınız!';
        } else { // King capture
            const winner = winnerColor === 'white' ? 'Beyaz' : 'Siyah';
            message = `${winner} kazandı!`;
        }
        winnerText.innerText = message;
        
        const modalContents = document.querySelectorAll('.modal-content > div');
        modalContents.forEach(el => el.classList.add('hidden'));
        gameSetupModal.classList.remove('hidden');
        gameOverMessage.classList.remove('hidden');
        isPlayerTurn = false;
    }

    // --- ONLINE LOGIC ---
    function connectOnline() {
        if (socket) return;
        socket = io();

        socket.on('roomCreated', (roomCode) => {
            roomCodeDisplay.innerText = roomCode;
            roomCreatedScreen.classList.remove('hidden');
        });

        socket.on('joinError', (message) => {
            joinErrorMsg.innerText = message;
        });

        socket.on('gameStart', (data) => {
            gameSettings.playerColor = data.color;
            gameSettings.room = data.room;
            isPlayerTurn = (data.color === 'white');
            startGame();
        });

        socket.on('opponentMove', (move) => {
            executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, false);
            isPlayerTurn = true;
        });

        socket.on('opponentDisconnected', () => {
            endGame(gameSettings.playerColor, 'opponentDisconnected');
        });
    }

    // --- DRAG & DROP LOGIC (UNIFIED FOR MOUSE AND TOUCH) ---
    function handleDragStart(e) {
        if (!isPlayerTurn) return;
        
        const pieceElement = e.target.closest('.piece');
        if (!pieceElement) return;

        // Prevent page scroll on touch devices
        if (e.type === 'touchstart') {
            e.preventDefault();
        }

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
        highlightValidMoves();

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove, { passive: false });

        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
    }

    function handleDragMove(e) {
        if (draggedElement) {
            if (e.type === 'touchmove') {
                e.preventDefault();
            }
            positionDraggedElement(e);
        }
    }

    function handleDragEnd(e) {
        if (!draggedElement) return;

        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const targetSquare = getSquareFromCoordinates(touch.clientX, touch.clientY);
        
        if (targetSquare) {
            const toRow = parseInt(targetSquare.dataset.row);
            const toCol = parseInt(targetSquare.dataset.col);
            if (isValidMove(toRow, toCol)) {
                handleLocalMove(selectedPiece.row, selectedPiece.col, toRow, toCol);
            }
        }

        document.body.removeChild(draggedElement);
        originalSquare.querySelector('.piece')?.classList.remove('piece-hidden');
        clearHighlights();

        draggedElement = null;
        selectedPiece = null;
        originalSquare = null;

        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
    }

    function positionDraggedElement(e) {
        const touch = e.touches ? e.touches[0] : e;
        draggedElement.style.left = `${touch.clientX - draggedElement.offsetWidth / 2}px`;
        draggedElement.style.top = `${touch.clientY - draggedElement.offsetHeight / 2}px`;
    }

    function getSquareFromCoordinates(x, y) {
        // Hide the dragged element so it doesn't block the detection
        draggedElement.style.display = 'none';
        const element = document.elementFromPoint(x, y);
        // Show it again
        draggedElement.style.display = '';
        return element?.closest('.square');
    }

    // --- BOARD & MOVE LOGIC ---
    function handleLocalMove(fromRow, fromCol, toRow, toCol) {
        const movingPieceId = board[fromRow][fromCol];
        const targetPieceId = board[toRow][toCol];

        if (gameSettings.rules === 'kingCapture' && movingPieceId.endsWith('king') && targetPieceId) {
            pendingMove = { fromRow, fromCol, toRow, toCol };
            gameSetupModal.classList.remove('hidden');
            kingCaptureConfirm.classList.remove('hidden');
            return;
        }

        if (gameSettings.mode === 'online') {
            isPlayerTurn = false;
            socket.emit('move', { room: gameSettings.room, move: { fromRow, fromCol, toRow, toCol } });
        }
        
        executeMove(fromRow, fromCol, toRow, toCol, true);
    }

    function executeMove(fromRow, fromCol, toRow, toCol, isLocalMove) {
        const movingPieceId = board[fromRow][fromCol];
        const targetPieceId = board[toRow][toCol];
        let newPieceId = movingPieceId;

        logMove(fromRow, fromCol, toRow, toCol, movingPieceId, targetPieceId);

        if (gameSettings.rules === 'kingCapture' && targetPieceId) {
            const capturedType = targetPieceId.substring(2);
            const movingColor = movingPieceId.substring(0, 2);
            newPieceId = movingColor + capturedType;
            statusMessage.innerText = `${PIECES[movingPieceId]} ${PIECES[targetPieceId]}'ı yedi ve ${PIECES[newPieceId]}'e dönüştü!`
        } else if (targetPieceId) {
            statusMessage.innerText = 'Taş alındı!';
        } else {
            statusMessage.innerText = '';
        }

        board[toRow][toCol] = newPieceId;
        board[fromRow][fromCol] = null;

        if (newPieceId?.endsWith('pawn') && (toRow === 0 || toRow === 7)) {
            board[toRow][toCol] = newPieceId.replace('pawn', 'queen');
            statusMessage.innerText = `Piyon terfi etti!`
        }

        if (gameSettings.rules === 'kingCapture' && targetPieceId?.endsWith('king')) {
            endGame(turn, 'kingCapture');
            return;
        }

        turn = turn === 'white' ? 'black' : 'white';
        renderBoard();

        // Check for checkmate/stalemate in traditional mode
        if (gameSettings.rules === 'traditional') {
            const gameStatus = getGameStatus(turn, board);
            if (gameStatus !== 'ongoing') {
                endGame(turn === 'white' ? 'black' : 'white', gameStatus);
                return;
            }
        }

        if (isLocalMove && gameSettings.mode === 'ai' && turn.charAt(0) !== gameSettings.playerColor.charAt(0)) {
            isPlayerTurn = false;
            setTimeout(makeAiMove, 500);
        }
    }

    function initializeBoard() {
        board = [
            ['b_rook', 'b_knight', 'b_bishop', 'b_queen', 'b_king', 'b_bishop', 'b_knight', 'b_rook'],
            ['b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn', 'b_pawn'],
            ...Array.from({ length: 4 }, () => Array(8).fill(null)),
            ['w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn', 'w_pawn'],
            ['w_rook', 'w_knight', 'w_bishop', 'w_queen', 'w_king', 'w_bishop', 'w_knight', 'w_rook']
        ];
    }

    function renderBoard() {
        chessboard.innerHTML = '';
        const kingInCheck = (gameSettings.rules === 'traditional') ? findKing(turn, board) : null;
        const isCheck = kingInCheck ? isSquareAttacked(kingInCheck.r, kingInCheck.c, turn === 'white' ? 'b' : 'w', board) : false;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
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
        updateTurnInfo();
    }

    // --- TRADITIONAL CHESS LOGIC ---

    function getPseudoLegalMoves(pieceId, r, c, currentBoard) {
        const [color, type] = pieceId.split('_');
        const moves = [];
        const opponentColor = color === 'w' ? 'b' : 'w';

        const addMove = (endR, endC) => {
            if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
                const target = currentBoard[endR][endC];
                if (target === null) {
                    moves.push({ r: endR, c: endC });
                    return true; // Can continue sliding
                } else if (target.startsWith(opponentColor)) {
                    moves.push({ r: endR, c: endC });
                    return false; // Blocked by opponent
                }
            }
            return false; // Off board or blocked by own piece
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
                // Forward 1
                if (r + dir >= 0 && r + dir < 8 && currentBoard[r + dir][c] === null) {
                    moves.push({ r: r + dir, c: c });
                    // Forward 2 from start
                    if (r === startRow && currentBoard[r + 2 * dir][c] === null) {
                        moves.push({ r: r + 2 * dir, c: c });
                    }
                }
                // Capture
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

    function isSquareAttacked(r, c, attackerColor, currentBoard) {
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

    function findKing(kingColor, currentBoard) {
        const kingPieceId = kingColor.charAt(0) + '_king';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (currentBoard[r][c] === kingPieceId) {
                    return { r, c };
                }
            }
        }
        return null; // Should not happen
    }

    function getValidMoves(pieceId, r, c, currentBoard) {
        const pseudoMoves = getPseudoLegalMoves(pieceId, r, c, currentBoard);
        if (gameSettings.rules === 'kingCapture') {
            return pseudoMoves;
        }

        // Filter for traditional rules (don't leave king in check)
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
        if (!kingPos) return 'ongoing'; // Should not happen in traditional

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

    function isValidMove(row, col) {
        return selectedPiece?.validMoves.some(move => move.r === row && move.c === col);
    }

    function clearHighlights() {
        document.querySelectorAll('.valid-move, .check').forEach(el => el.classList.remove('valid-move', 'check'));
    }

    function highlightValidMoves() {
        selectedPiece?.validMoves.forEach(move => {
            document.querySelector(`[data-row='${move.r}'][data-col='${move.c}']`)?.classList.add('valid-move');
        });
    }

    function updateTurnInfo() {
        turnInfo.innerText = turn === 'white' ? 'Beyazın Sırası' : 'Siyahın Sırası';
        if (gameSettings.mode === 'online') {
            const myTurn = (turn.charAt(0) === gameSettings.playerColor.charAt(0));
            turnInfo.innerText += myTurn ? ' (Siz)' : ' (Rakip)';
        }
    }

    function logMove(fromRow, fromCol, toRow, toCol, pieceId, targetId) {
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

    function makeAiMove() {
        const aiColor = gameSettings.playerColor === 'white' ? 'b' : 'w';
        const allMoves = getAllPossibleMoves(aiColor, board);

        if (allMoves.length === 0) {
            isPlayerTurn = true;
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
        isPlayerTurn = true;
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

    init();
});