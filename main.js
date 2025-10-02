import * as ui from './ui.js';
import * as state from './state.js';
import { startGame } from './game.js';
import { connectOnline } from './online.js';
import { handleDragStart } from './dragDrop.js';

document.addEventListener('DOMContentLoaded', init);

function init() {
    // Show game setup screen and connect to server
    ui.newGameSetupScreen.classList.remove('hidden');
    ui.joinRoomScreen.classList.add('hidden');
    ui.gameSetupModal.classList.add('hidden');
    ui.colorSelection.classList.add('hidden');
    ui.gameOverModal.classList.add('hidden');
    ui.restartConfirmModal.classList.add('hidden');
    ui.gameContainer.classList.add('hidden');

    connectOnline();
    document.querySelector('h1').style.display = 'none';

    // Global listener for showing the game screen (triggered by online.js)
    document.addEventListener('showGameScreen', showGameScreenAndHideMenus);

    // Setup Screen Listeners
    ui.rulesGroup.addEventListener('click', handleSelection);
    ui.modeGroup.addEventListener('click', handleSelection);
    ui.difficultyGroup.addEventListener('click', handleSelection);
    ui.startGameBtn.addEventListener('click', handleStartGame);
    ui.createRoomBtnNew.addEventListener('click', handleCreateRoom);
    ui.joinRoomBtnNew.addEventListener('click', handleJoinRoom);
    ui.submitJoinBtn.addEventListener('click', () => {
        const roomCode = ui.roomCodeInput.value.trim();
        if (roomCode && state.socket) {
            state.socket.emit('joinRoom', roomCode);
        }
    });

    // In-Game Listeners
    ui.chessboard.addEventListener('mousedown', handleDragStart);
    ui.chessboard.addEventListener('touchstart', handleDragStart, { passive: false });
    ui.colorSelection.addEventListener('click', handleColorSelection);
    
    // In-Game Menu Button Listeners
    ui.restartGameBtn.addEventListener('click', promptForRestart);
    ui.returnToMenuBtn.addEventListener('click', returnToMenu);

    // Modal Button Listeners
    ui.closeGameOverBtn.addEventListener('click', () => ui.gameOverModal.classList.add('hidden'));
    ui.confirmRestartBtn.addEventListener('click', handleConfirmRestart);
    ui.cancelRestartBtn.addEventListener('click', handleCancelRestart);
}

// --- Navigation and Flow Functions ---

function handleStartGame() {
    const settings = state.gameSettings;
    if (settings.mode === 'ai') {
        ui.newGameSetupScreen.classList.add('hidden');
        ui.colorSelection.classList.remove('hidden');
    } else { // For local friend mode
        showGameScreenAndHideMenus();
        startGame();
    }
}

function showGameScreen() {
    document.querySelector('h1').style.display = 'block';
    ui.gameContainer.classList.remove('hidden');
}

function showGameScreenAndHideMenus() {
    ui.newGameSetupScreen.classList.add('hidden');
    ui.joinRoomScreen.classList.add('hidden');
    ui.gameSetupModal.classList.add('hidden');
    ui.colorSelection.classList.add('hidden');
    ui.restartConfirmModal.classList.add('hidden');
    ui.gameOverModal.classList.add('hidden');
    showGameScreen();
}

function returnToMenu() {
    ui.gameContainer.classList.add('hidden');
    document.querySelector('h1').style.display = 'none';
    ui.newGameSetupScreen.classList.remove('hidden');

    // Reset selections in the setup menu
    state.setGameSettings({ rules: null, mode: null, difficulty: null, playerColor: null });
    ui.rulesGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    ui.modeGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    ui.difficultyGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    updateUIBasedOnSelections();
}

// --- Modal Handlers ---

function promptForRestart() {
    ui.restartConfirmModal.classList.remove('hidden');
}

function handleConfirmRestart() {
    ui.restartConfirmModal.classList.add('hidden');
    startGame();
}

function handleCancelRestart() {
    ui.restartConfirmModal.classList.add('hidden');
}

// --- Event Handlers for Selections ---

function handleColorSelection(e) {
    const button = e.target.closest('button');
    if (!button) return;
    state.setGameSettings({ playerColor: button.dataset.color });
    ui.colorSelection.classList.add('hidden');
    showGameScreenAndHideMenus();
    startGame();
}

function handleSelection(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const group = button.parentElement;
    if(group.parentElement.classList.contains('disabled')) return;

    group.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const { rule, mode, difficulty } = button.dataset;
    if (rule) state.setGameSettings({ rules: rule });
    if (mode) state.setGameSettings({ mode: mode });
    if (difficulty) state.setGameSettings({ difficulty: difficulty });

    updateUIBasedOnSelections();
}

function updateUIBasedOnSelections() {
    const settings = state.gameSettings;

    // Handle AI difficulty section visibility
    if (settings.mode === 'ai') {
        ui.difficultySection.classList.remove('disabled');
    } else {
        ui.difficultySection.classList.add('disabled');
        state.setGameSettings({ difficulty: null });
        ui.difficultyGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    }

    // Reset all buttons to hidden by default
    ui.startGameBtn.classList.add('hidden');
    ui.createRoomBtnNew.classList.add('hidden');
    ui.joinRoomBtnNew.classList.add('hidden');

    // Explicitly set visibility based on selections
    if (settings.mode === 'online') {
        ui.joinRoomBtnNew.classList.remove('hidden');
        if (settings.rules) {
            ui.createRoomBtnNew.classList.remove('hidden');
        }
    } else if (settings.mode === 'ai') {
        if (settings.rules && settings.difficulty) {
            ui.startGameBtn.classList.remove('hidden');
        }
    } else if (settings.mode === 'friend') {
        if (settings.rules) {
            ui.startGameBtn.classList.remove('hidden');
        }
    }
}

// --- Online-specific Functions ---

function handleCreateRoom() {
    if (state.socket) {
        state.socket.emit('createRoom', { rules: state.gameSettings.rules });
        ui.newGameSetupScreen.classList.add('hidden');
        ui.gameSetupModal.classList.remove('hidden');
        ui.roomCreatedScreen.classList.remove('hidden');
    }
}

function handleJoinRoom() {
    ui.newGameSetupScreen.classList.add('hidden');
    ui.joinRoomScreen.classList.remove('hidden');
}