
import * as ui from './ui.js';
import * as state from './state.js';
import { startGame } from './game.js';
import { connectOnline } from './online.js';
import { handleMouseDown } from './dragDrop.js';

document.addEventListener('DOMContentLoaded', init);

function init() {
    // Show game setup screen directly, bypassing login
    ui.newGameSetupScreen.classList.remove('hidden');
    connectOnline();
    document.querySelector('h1').style.display = 'none'; // Hide main title initially

    // Event Listeners
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
    ui.restartSameModeBtn.addEventListener('click', handleRestartSameMode);
    ui.changeModeBtn.addEventListener('click', handleChangeMode);
    
    ui.chessboard.addEventListener('mousedown', handleMouseDown);
}

function handleRestartSameMode() {
    ui.gameOverModal.classList.add('hidden');
    showGameScreen();
    startGame();
}

function handleChangeMode() {
    ui.gameOverModal.classList.add('hidden');
    
    // Reset selections
    state.setGameSettings({ rules: null, mode: null, difficulty: null, playerColor: null });
    ui.rulesGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    ui.modeGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    ui.difficultyGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    updateUIBasedOnSelections();

    ui.newGameSetupScreen.classList.remove('hidden');
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

    if (settings.mode === 'ai') {
        ui.difficultySection.classList.remove('disabled');
    } else {
        ui.difficultySection.classList.add('disabled');
        state.setGameSettings({ difficulty: null });
        ui.difficultyGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    }

    ui.startGameBtn.classList.add('hidden');
    ui.createRoomBtnNew.classList.add('hidden');
    ui.joinRoomBtnNew.classList.add('hidden'); // Hide by default

    if (settings.mode === 'online') {
        if (settings.rules) {
            ui.createRoomBtnNew.classList.remove('hidden');
        }
        ui.joinRoomBtnNew.classList.remove('hidden'); // Show for online
    } else if (settings.mode === 'ai') {
        if (settings.rules && settings.difficulty) {
            ui.startGameBtn.classList.remove('hidden');
        }
    } else if (settings.mode === 'friend') {
        if (settings.rules) {
            ui.startGameBtn.classList.remove('hidden');
        }
    } else {
        // If no mode selected, show join button
        ui.joinRoomBtnNew.classList.remove('hidden');
    }
}

function handleStartGame() {
    const settings = state.gameSettings;
    // For AI mode, we need to let the player choose a color
    if (settings.mode === 'ai') {
        ui.newGameSetupScreen.classList.add('hidden');
        ui.colorSelection.classList.remove('hidden'); // Show the new top-level color screen

        // Add temporary listeners for color selection
        const colorHandler = (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            state.setGameSettings({ playerColor: button.dataset.color });
            ui.colorSelection.classList.add('hidden');
            showGameScreen();
            startGame();
        };
        ui.colorSelection.addEventListener('click', colorHandler, { once: true });

    } else { // For local friend mode, just start
        ui.newGameSetupScreen.classList.add('hidden');
        showGameScreen();
        startGame();
    }
}
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

function showGameScreen() {
    document.querySelector('h1').style.display = 'block';
    ui.gameContainer.classList.remove('hidden');
}
