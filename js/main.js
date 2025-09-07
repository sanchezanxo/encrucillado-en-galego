// Helper functions - Funcións auxiliares para manipular celdas

// Obtén o elemento DOM dunha celda específica pola súa posición na grella
function getCellElement(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// Actualiza o texto dunha celda e devolve o elemento
function updateCellText(row, col, text) {
    const cell = getCellElement(row, col);
    if (cell) cell.textContent = text;
    return cell;
}

// Configuration
const CONFIG = {
    POINTS_PER_LETTER: 10,
    TIME_BONUS: 5,
    LEVELS: [
        {id: 1, palabras: 6, tempo: 180, tema: "Fácil"},      // 3 min inicial
        {id: 2, palabras: 9, tempo: 120, tema: "Medio"},      // +2 min extra (máx 5 min)
        {id: 3, palabras: 13, tempo: 90, tema: "Difícil"}     // +1.5 min extra (máx 6.5 min)
    ]
};

// Game state
let gameState = {
    grid: [],
    words: [],
    placedWords: [],
    foundWords: [],
    score: 0,                    // Score for current level
    totalScore: 0,               // Accumulated score across all levels
    completedLevels: [],         // Array of completed level numbers
    currentLevel: 1,
    timeRemaining: null,
    timerInterval: null,
    isGameActive: true,
    selectedWord: null,
    selectedCells: [],
    currentInput: '',
    crosswordGrid: null
};

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Iniciando crucigrama...');
        await startGame();
        setupEventListeners();
        createMobileKeyboardInput();
    } catch (error) {
        console.error('Error iniciando xogo:', error);
        showError('Error cargando o xogo. Inténtao de novo.');
    }
});

// Inicia unha nova partida cargando palabras e xerando o crucigrama
async function startGame() {
    try {
        await loadWordsForLevel(gameState.currentLevel);
        generateCrossword();
        updateUI();
        console.log('Crucigrama iniciado correctamente');
    } catch (error) {
        console.error('Error iniciando xogo:', error);
        showError('Error cargando o xogo. Inténtao de novo.');
    }
}

// Carga as palabras para un nivel específico dende o arquivo JSON
async function loadWordsForLevel(level) {
    try {
        const levelConfig = CONFIG.LEVELS.find(l => l.id === level);
        if (!levelConfig) {
            throw new Error(`Nivel ${level} non atopado`);
        }
        
        const response = await fetch('data/palabras.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const allWords = data.palabras || [];
        
        // Filter words that fit and are reasonable length
        const filteredWords = allWords
            .filter(wordObj => wordObj.palabra && wordObj.palabra.length <= 13 && wordObj.palabra.length >= 3);
        
        // Select random words from the filtered list
        gameState.words = selectRandomWords(filteredWords, levelConfig.palabras);
        
        // Implement cumulative time system
        if (gameState.currentLevel === 1) {
            // First level: use base time
            gameState.timeRemaining = levelConfig.tempo;
        } else {
            // Subsequent levels: add extra time to remaining time
            gameState.timeRemaining = (gameState.timeRemaining || 0) + levelConfig.tempo;
        }
        
        console.log(`Nivel ${level} cargado con ${gameState.words.length} palabras`);
        updateCluesList();
        
        // Start timer if level has time limit
        if (gameState.timeRemaining) {
            startTimer();
        } else {
            hideTimer();
        }
        
    } catch (error) {
        console.error('Error loading words for level:', level, error);
        // Fallback words if file can't be loaded
        const fallbackWords = [
            {palabra: 'GALEGO', definicion: 'Lingua oficial de Galicia'},
            {palabra: 'LINGUA', definicion: 'Órgano muscular da boca'},
            {palabra: 'GAITA', definicion: 'Instrumento musical tradicional'},
            {palabra: 'QUEIMADA', definicion: 'Bebida típica galega'},
            {palabra: 'HORREO', definicion: 'Construcción para gardar gran'},
            {palabra: 'CURSOS', definicion: 'Clases ou leccións'}
        ];
        gameState.words = selectRandomWords(fallbackWords, 6);
        updateCluesList();
        console.log('Usando palabras por defecto');
    }
}

// Selecciona aleatoriamente un número determinado de palabras dun array
function selectRandomWords(wordsArray, maxWords) {
    if (wordsArray.length <= maxWords) {
        return [...wordsArray];
    }
    
    const shuffled = [...wordsArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxWords);
}

// Actualiza a lista de pistas na interfaz (será poboada após a xeración do crucigrama)
function updateCluesList() {
    const horizontalClues = document.getElementById('horizontalClues');
    const verticalClues = document.getElementById('verticalClues');
    const totalCount = document.getElementById('totalCount');
    
    if (!horizontalClues || !verticalClues || !totalCount) return;
    
    horizontalClues.innerHTML = '';
    verticalClues.innerHTML = '';
    
    // This will be populated after crossword generation
    totalCount.textContent = gameState.words.length;
}

// Configura os event listeners principais do xogo
function setupEventListeners() {
    // Prevent text selection only on game area
    document.addEventListener('selectstart', e => {
        if (e.target && e.target.classList && e.target.classList.contains('grid-cell')) {
            e.preventDefault();
        }
    });
    
    // Keyboard input for crossword
    document.addEventListener('keydown', handleKeyPress);
}

// Xestiona as pulsacións de teclado durante o xogo
function handleKeyPress(event) {
    if (!gameState.isGameActive) return;
    
    const key = event.key.toUpperCase();
    
    if (key === 'BACKSPACE' && gameState.selectedWord) {
        event.preventDefault();
        handleBackspace();
    } else if (key === 'ENTER' && gameState.selectedWord) {
        event.preventDefault();
        checkCurrentWord();
    } else if (key === 'ESCAPE') {
        clearSelection();
    } else if (/^[A-ZÁÉÍÓÚÑ]$/.test(key) && gameState.selectedWord) {
        event.preventDefault();
        handleLetterInput(key);
        // Show mobile keyboard only when user starts typing to avoid initial scroll
        showMobileKeyboard();
    }
}

// Procesa a entrada dunha letra na palabra seleccionada
function handleLetterInput(letter) {
    if (!gameState.selectedWord || !gameState.selectedCells.length) return;
    
    const currentIndex = gameState.currentInput.length;
    if (currentIndex < gameState.selectedCells.length) {
        const cell = gameState.selectedCells[currentIndex];
        const cellElement = updateCellText(cell.row, cell.col, letter);
        
        if (cellElement) {
            gameState.currentInput += letter;
            
            // Move to next cell visually
            updateCellHighlights();
            
            // Auto-check word when complete (mobile UX improvement)
            if (gameState.currentInput.length === gameState.selectedCells.length) {
                setTimeout(() => {
                    checkCurrentWord();
                }, 300); // Small delay to let user see the complete word
            }
        }
    }
}

// Xestiona a tecla de retroceso para borrar letras
function handleBackspace() {
    if (!gameState.selectedWord || gameState.currentInput.length === 0) return;
    
    gameState.currentInput = gameState.currentInput.slice(0, -1);
    const currentIndex = gameState.currentInput.length;
    
    if (currentIndex < gameState.selectedCells.length) {
        const cell = gameState.selectedCells[currentIndex];
        const cellElement = getCellElement(cell.row, cell.col);
        
        if (cellElement && !cellElement.classList.contains('completed')) {
            cellElement.textContent = '';
        }
        
        updateCellHighlights();
    }
}

// Verifica se a palabra actual introducida é correcta
function checkCurrentWord() {
    if (!gameState.selectedWord) return;
    
    const correctWord = gameState.selectedWord.palabra;
    if (gameState.currentInput === correctWord) {
        // Word is correct!
        markWordAsCompleted(gameState.selectedWord);
        gameState.score += correctWord.length * CONFIG.POINTS_PER_LETTER;
        updateScoreDisplay();
        updateProgressDisplay();
        
        // Check if game is completed
        if (gameState.foundWords.length === gameState.words.length) {
            setTimeout(() => endGame(true), 500);
        } else {
            clearSelection();
        }
    } else {
        // Word is incorrect - clear input
        clearCurrentInput();
    }
}

// Marca unha palabra como completada visualmente e no estado do xogo
function markWordAsCompleted(wordObj) {
    gameState.foundWords.push(wordObj);
    
    // Mark cells as completed
    gameState.selectedCells.forEach(cell => {
        const cellElement = getCellElement(cell.row, cell.col);
        if (cellElement) {
            cellElement.classList.add('completed');
        }
    });
    
    // Mark clue as completed
    const clueElement = document.querySelector(`[data-word="${wordObj.palabra}"]`);
    if (clueElement) {
        clueElement.classList.add('completed');
    }
}

// Limpa a entrada actual da palabra seleccionada
function clearCurrentInput() {
    gameState.selectedCells.forEach(cell => {
        const cellElement = getCellElement(cell.row, cell.col);
        if (cellElement && !cellElement.classList.contains('completed')) {
            cellElement.textContent = '';
        }
    });
    gameState.currentInput = '';
    updateCellHighlights();
}

// Limpa toda a selección actual (palabra e celdas)
function clearSelection() {
    // Clear visual selection
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('active', 'highlight');
    });
    
    document.querySelectorAll('.clue-item').forEach(clue => {
        clue.classList.remove('active');
    });
    
    gameState.selectedWord = null;
    gameState.selectedCells = [];
    gameState.currentInput = '';
    
    // Hide mobile keyboard
    hideMobileKeyboard();
}

// Actualiza o destacado visual das celdas segundo o progreso da entrada
function updateCellHighlights() {
    gameState.selectedCells.forEach((cell, index) => {
        const cellElement = getCellElement(cell.row, cell.col);
        if (cellElement) {
            cellElement.classList.remove('active', 'highlight');
            if (index === gameState.currentInput.length) {
                cellElement.classList.add('active');
            } else if (index < gameState.currentInput.length) {
                cellElement.classList.add('highlight');
            }
        }
    });
}

// Timer functions - Funcións de xestión do temporizador

// Inicia o temporizador do nivel
function startTimer() {
    if (!gameState.timeRemaining) return;
    
    showTimer();
    updateTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();
        
        if (gameState.timeRemaining <= 0) {
            stopTimer();
            endGame(false); // Time's up
        }
    }, 1000);
}

// Detén o temporizador
function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// Mostra o temporizador na interfaz
function showTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.style.display = 'block';
    }
}

// Oculta o temporizador
function hideTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.style.display = 'none';
    }
}

// Actualiza a visualización do temporizador e cambia cores segundo o tempo restante
function updateTimerDisplay() {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay && gameState.timeRemaining !== null) {
        const minutes = Math.floor(gameState.timeRemaining / 60);
        const seconds = gameState.timeRemaining % 60;
        timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add warning color when time is low
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            if (gameState.timeRemaining <= 30) {
                timerElement.style.backgroundColor = '#d63031';
            } else if (gameState.timeRemaining <= 60) {
                timerElement.style.backgroundColor = '#e17055';
            } else {
                timerElement.style.backgroundColor = '#636B46';
            }
        }
    }
}

// Actualiza todos os elementos da interfaz de usuario
function updateUI() {
    const levelInfo = document.getElementById('nivel-info');
    const levelConfig = CONFIG.LEVELS.find(l => l.id === gameState.currentLevel);
    
    if (levelInfo && levelConfig) {
        // Show current level and completed levels info
        const completedText = gameState.completedLevels.length > 0 
            ? ` | Completados: ${gameState.completedLevels.join(', ')}`
            : '';
        levelInfo.textContent = `Nivel ${gameState.currentLevel} - ${levelConfig.tema}${completedText}`;
    }
    
    updateScoreDisplay();
    updateProgressDisplay();
    generateLevelButtons();
}

// Mostra unha mensaxe de erro ao usuario
function showError(message) {
    alert(message); // Simple for now, can be improved later
}

// Update score display
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        // Show current level score + total accumulated score
        const displayScore = gameState.score + gameState.totalScore;
        scoreElement.textContent = displayScore;
    }
}

// Update progress display
function updateProgressDisplay() {
    const foundCount = document.getElementById('foundCount');
    if (foundCount) {
        foundCount.textContent = gameState.foundWords.length;
    }
}

// Finaliza o xogo calculando puntuación e mostrando resultados
function endGame(completed) {
    gameState.isGameActive = false;
    stopTimer();
    
    // Calculate final score with bonus
    let finalScore = gameState.score;
    if (completed && gameState.timeRemaining) {
        const timeBonus = gameState.timeRemaining * CONFIG.TIME_BONUS;
        finalScore += timeBonus;
        gameState.score = finalScore;
        updateScoreDisplay();
    }
    
    // Add current level to completed levels and accumulate score
    if (completed && !gameState.completedLevels.includes(gameState.currentLevel)) {
        gameState.completedLevels.push(gameState.currentLevel);
        gameState.totalScore += gameState.score;
    }
    
    // Check if there are more levels to play
    const hasMoreLevels = gameState.currentLevel < CONFIG.LEVELS.length;
    
    if (completed && hasMoreLevels) {
        // Auto-advance to next level without modal
        console.log('Nivel completado! Avanzando automaticamente...');
        setTimeout(() => {
            nextLevel();
        }, 1500); // Show completion message briefly
        
        // Show brief success message instead of modal
        showLevelCompletedMessage();
        
    } else {
        // Show score modal only at the end or when losing
        const totalFinalScore = gameState.totalScore;
        showScoreModal(completed, totalFinalScore);
    }
}

// Level completion functions - Funcións de finalización de nivel

// Mostra unha mensaxe breve de nivel completado
function showLevelCompletedMessage() {
    const message = document.createElement('div');
    message.id = 'levelCompleteMessage';
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-primary);
        color: white;
        padding: 20px 30px;
        border-radius: var(--border-radius);
        font-size: 1.2rem;
        font-weight: 600;
        text-align: center;
        z-index: 2000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    const timeMinutes = Math.floor(gameState.timeRemaining / 60);
    const timeSeconds = gameState.timeRemaining % 60;
    const timeDisplay = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
    
    message.innerHTML = `
        <div>¡Nivel ${gameState.currentLevel} completado!</div>
        <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.9;">
            Puntuación total: ${gameState.totalScore} puntos
        </div>
        <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">
            Tempo restante: ${timeDisplay} | Avanzando...
        </div>
    `;
    
    document.body.appendChild(message);
    
    // Remove message after 1.3 seconds
    setTimeout(() => {
        if (document.getElementById('levelCompleteMessage')) {
            document.body.removeChild(message);
        }
    }, 1300);
}

// Score modal functions - Funcións do modal de puntuación

// Mostra o modal de puntuación final
function showScoreModal(completed, score) {
    const modal = document.getElementById('scoreModal');
    const title = document.getElementById('scoreTitle');
    const message = document.getElementById('scoreMessage');
    const finalScore = document.getElementById('finalScore');
    
    if (modal && title && message && finalScore) {
        title.textContent = completed ? '¡Crucigrama completado!' : '¡Acabouse o tempo!';
        finalScore.textContent = score;
        modal.style.display = 'flex';
    }
}

// Pecha o modal de puntuación
function closeScoreModal() {
    const modal = document.getElementById('scoreModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear input
        const nameInput = document.getElementById('playerName');
        if (nameInput) nameInput.value = '';
    }
}

// Garda a puntuación do xogador no servidor
async function saveScore() {
    const nameInput = document.getElementById('playerName');
    const playerName = nameInput ? nameInput.value.trim() : '';
    
    if (!playerName) {
        alert('Introduce o teu nome para gardar a puntuación');
        return;
    }
    
    const scoreData = {
        name: playerName,
        email: '', // Not needed anymore
        level: Math.max(...gameState.completedLevels) || gameState.currentLevel,  // Highest completed level
        score: gameState.totalScore,  // Save total accumulated score
        foundWords: gameState.foundWords.length,
        totalWords: gameState.words.length,
        completedLevels: gameState.completedLevels,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Save to server
        await savePlayerData(scoreData);
        
        alert('¡Puntuación gardada correctamente!');
        closeScoreModal();
        
        // Show ranking after saving
        setTimeout(() => showRanking(), 500);
        
        // Offer to restart game
        setTimeout(() => {
            if (confirm('¿Queres xogar de novo?')) {
                restartGame();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error gardando puntuación:', error);
        alert('Error gardando puntuación no servidor');
        closeScoreModal();
    }
}

// Omite gardar a puntuación e reinicia o xogo
function skipSaveScore() {
    closeScoreModal();
    
    // Offer to restart game
    setTimeout(() => {
        if (confirm('¿Queres xogar de novo?')) {
            restartGame();
        }
    }, 500);
}

// Avanza ao seguinte nivel se está dispoñible
async function nextLevel() {
    if (gameState.currentLevel < CONFIG.LEVELS.length) {
        // Score accumulation is handled in endGame()
        gameState.currentLevel++;
        gameState.foundWords = [];
        gameState.isGameActive = true;
        gameState.score = 0;  // Reset current level score, but keep totalScore
        stopTimer();
        clearSelection();
        
        await loadWordsForLevel(gameState.currentLevel);
        generateCrossword();
        updateUI();
    }
}

// Reinicia o nivel actual
async function restartLevel() {
    gameState.foundWords = [];
    gameState.isGameActive = true;
    gameState.score = 0;
    // Keep cumulative time and totalScore when restarting level
    stopTimer();
    clearSelection();
    
    await loadWordsForLevel(gameState.currentLevel);
    generateCrossword();
    updateUI();
}

// Reinicia o xogo dende o nivel 1
async function restartGame() {
    gameState.currentLevel = 1;
    gameState.score = 0;
    gameState.totalScore = 0;
    gameState.completedLevels = [];
    gameState.foundWords = [];
    gameState.isGameActive = true;
    stopTimer();
    clearSelection();
    
    await loadWordsForLevel(gameState.currentLevel);
    generateCrossword();
    updateUI();
}

// Level selector functions - Funcións do selector de niveis

// Mostra o modal de selección de niveis
function showLevelSelector() {
    const modal = document.getElementById('levelModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Pecha o modal de selección de niveis
function closeLevelModal() {
    const modal = document.getElementById('levelModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Xera os botóns para cada nivel dispoñible
function generateLevelButtons() {
    const levelButtons = document.getElementById('levelButtons');
    if (!levelButtons) return;
    
    levelButtons.innerHTML = '';
    CONFIG.LEVELS.forEach(level => {
        const button = document.createElement('button');
        button.className = 'btn-level';
        button.textContent = `Nivel ${level.id} - ${level.tema}`;
        button.onclick = () => selectLevel(level.id);
        
        if (level.id === gameState.currentLevel) {
            button.classList.add('active');
        }
        
        levelButtons.appendChild(button);
    });
}

// Selecciona e carga un nivel específico
async function selectLevel(levelId) {
    if (levelId !== gameState.currentLevel) {
        gameState.currentLevel = levelId;
        gameState.foundWords = [];
        gameState.isGameActive = true;
        gameState.score = 0;
        stopTimer();
        clearSelection();
        
        await loadWordsForLevel(gameState.currentLevel);
        generateCrossword();
        updateUI();
    }
    closeLevelModal();
}

// Envía os datos do xogador ao servidor para o seu almacenamento
async function savePlayerData(playerData) {
    try {
        const response = await fetch('private/save_lead.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playerData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        // Score saved successfully
        
    } catch (error) {
        console.error('Error gardando no servidor:', error);
        console.info('💡 Asegúrate de que XAMPP está executándose e o PHP funciona');
        throw error; // Re-throw to handle in calling function
    }
}


// Ranking functions - Funcións de xestión do ranking

// Mostra o modal de ranking
async function showRanking() {
    const modal = document.getElementById('rankingModal');
    if (modal) {
        modal.style.display = 'flex';
        await loadRankingData();
    }
}

// Pecha o modal de ranking
function closeRankingModal() {
    const modal = document.getElementById('rankingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Carga os datos do ranking dende o servidor
async function loadRankingData() {
    const content = document.getElementById('rankingContent');
    if (!content) return;
    
    content.innerHTML = '<div class="loading">Cargando ranking...</div>';
    
    try {
        // ALWAYS try to load from server first
        let rankingData = await loadServerRanking();
        
        if (!rankingData) {
            displayRanking(null, content);
            return;
        }
        
        displayRanking(rankingData, content);
        
    } catch (error) {
        console.error('Error loading ranking:', error);
        displayRanking(null, content);
    }
}

// Intenta cargar o ranking dende o servidor
async function loadServerRanking() {
    try {
        const response = await fetch('private/get_stats.php');
        if (!response.ok) {
            console.warn(`Erro do servidor: ${response.status} ${response.statusText}`);
            return null;
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('O servidor non devolveu JSON:', contentType);
            return null;
        }
        
        const stats = await response.json();
        return stats;
        
    } catch (error) {
        console.warn('Non se puido cargar ranking do servidor:', error);
        console.info('💡 Asegúrate de que XAMPP está executándose e o PHP funciona');
        return null;
    }
}


// Mostra o ranking na interfaz
function displayRanking(data, container) {
    if (!data || !data.topScores) {
        container.innerHTML = '<div class="no-data">Sen datos de ranking</div>';
        return;
    }
    
    const scores = data.topScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    
    if (scores.length === 0) {
        container.innerHTML = '<div class="no-data">Sen puntuacións<br><small>¡Xoga para aparecer aquí!</small></div>';
        return;
    }
    
    const html = buildRankingHTML(scores, data);
    container.innerHTML = html;
}

// Constrúe o HTML do ranking
function buildRankingHTML(scores, data) {
    let html = '';
    
    if (data.totalGames) {
        html += buildStatsHTML(data);
    }
    
    html += '<ul class="ranking-list">';
    html += scores.map((score, index) => buildScoreItemHTML(score, index)).join('');
    html += '</ul>';
    
    return html;
}

// Constrúe o HTML das estadísticas xerais
function buildStatsHTML(data) {
    return `
        <div class="ranking-stats">
            <div class="stat">
                <div class="stat-number">${data.totalGames}</div>
                <div class="stat-label">Partidas</div>
            </div>
            <div class="stat">
                <div class="stat-number">${data.totalPlayers || 0}</div>
                <div class="stat-label">Xogadores</div>
            </div>
            <div class="stat">
                <div class="stat-number">TOP 10</div>
                <div class="stat-label">Mellores</div>
            </div>
        </div>
    `;
}

// Constrúe o HTML dun elemento individual do ranking
function buildScoreItemHTML(score, index) {
    const isTop3 = index < 3;
    const position = index + 1;
    const medal = position <= 3 ? `#${position}` : '';
    
    // Show completed levels if available
    const levelsInfo = score.completedLevels 
        ? `Niveis ${score.completedLevels.join(', ')}`
        : `Nivel ${score.level}`;
    
    return `
        <li class="ranking-item ${isTop3 ? 'top-3' : ''}">
            <div class="ranking-position">${medal || position}</div>
            <div class="ranking-info">
                <div class="ranking-name">${score.name || 'Anónimo'}</div>
                <div class="ranking-details">
                    ${levelsInfo} • ${score.date}
                </div>
            </div>
            <div class="ranking-score">${score.score}</div>
        </li>
    `;
}

// Social sharing functions - Funcións de compartir en RRSS

// Comparte a puntuación final nas redes sociais
async function shareScore() {
    const finalScore = gameState.totalScore;
    const completedLevels = gameState.completedLevels.length;
    const maxLevels = CONFIG.LEVELS.length;
    
    // Create share message
    const message = `🎯 Completei ${completedLevels}/${maxLevels} niveis do Encrucillado Galego!
📊 Puntuación total: ${finalScore} puntos
🏆 Aprende galego xogando!

Xoga ti tamén: https://encrucillado.cursos.gal

#GalegoXogo #AprendeGalego #CURSOSGAL`;
    
    // Try Web Share API first (mobile native)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Encrucillado Galego - A miña puntuación',
                text: message,
                url: 'https://encrucillado.cursos.gal'
            });
            console.log('Compartido con éxito');
            return;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Error coa Web Share API:', error);
            }
            // Fall through to manual sharing
        }
    }
    
    // Fallback: show manual sharing options
    showSharingOptions(message);
}

// Mostra opcións de compartir manuais
function showSharingOptions(message) {
    const encodedMessage = encodeURIComponent(message);
    const url = 'https://encrucillado.cursos.gal';
    const encodedUrl = encodeURIComponent(url);
    
    const options = [
        {
            name: 'Twitter',
            icon: '🐦',
            url: `https://twitter.com/intent/tweet?text=${encodedMessage}`
        },
        {
            name: 'Facebook',
            icon: '👥', 
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`
        },
        {
            name: 'WhatsApp',
            icon: '💬',
            url: `https://wa.me/?text=${encodedMessage}`
        },
        {
            name: 'Copiar texto',
            icon: '📋',
            action: () => copyToClipboard(message)
        }
    ];
    
    const modal = createSharingModal(options);
    document.body.appendChild(modal);
}

// Crea o modal de opcións de compartir
function createSharingModal(options) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'sharingModal';
    modal.style.cssText = 'display: flex; z-index: 3000;';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'max-width: 400px; text-align: center;';
    
    content.innerHTML = `
        <button class="modal-close" onclick="closeSharingModal()">&times;</button>
        <h3>Compartir puntuación</h3>
        <div class="sharing-options">
            ${options.map(option => `
                <button class="sharing-btn" onclick="${option.action ? 'copyScoreMessage()' : `window.open('${option.url}', '_blank')`}">
                    <span class="sharing-icon">${option.icon}</span>
                    <span class="sharing-name">${option.name}</span>
                </button>
            `).join('')}
        </div>
    `;
    
    modal.appendChild(content);
    return modal;
}

// Copia a mensaxe ao portapapeis
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('¡Mensaxe copiada ao portapapeis!');
        closeSharingModal();
    } catch (error) {
        console.warn('Error copiando ao portapapeis:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('¡Mensaxe copiada!');
        closeSharingModal();
    }
}

// Function accessible from HTML
function copyScoreMessage() {
    const finalScore = gameState.totalScore;
    const completedLevels = gameState.completedLevels.length;
    const maxLevels = CONFIG.LEVELS.length;
    
    const message = `🎯 Completei ${completedLevels}/${maxLevels} niveis do Encrucillado Galego!
📊 Puntuación total: ${finalScore} puntos
🏆 Aprende galego xogando!

Xoga ti tamén: https://encrucillado.cursos.gal

#GalegoXogo #AprendeGalego #CURSOSGAL`;
    
    copyToClipboard(message);
}

// Pecha o modal de compartir
function closeSharingModal() {
    const modal = document.getElementById('sharingModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Mobile keyboard support - Soporte para teclado en dispositivos móbiles

// Crea un input oculto para activar o teclado móbil
function createMobileKeyboardInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'mobileKeyboardInput';
    input.style.cssText = `
        position: fixed;
        top: -100px;
        left: -100px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
        border: none;
        background: transparent;
        outline: none;
    `;
    
    // Handle input from mobile keyboard
    input.addEventListener('input', function(e) {
        const letter = e.target.value.toUpperCase();
        if (letter && /^[A-ZÁÉÍÓÚÑ]$/.test(letter)) {
            handleLetterInput(letter);
        }
        // Clear input for next letter
        e.target.value = '';
    });
    
    // Handle backspace
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
            e.preventDefault();
            handleBackspace();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            checkCurrentWord();
        }
    });
    
    document.body.appendChild(input);
}

// Activa o teclado móbil sen causar scroll
function showMobileKeyboard() {
    const input = document.getElementById('mobileKeyboardInput');
    if (input && gameState.selectedWord) {
        // Prevent scroll when focusing
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        input.focus({ preventScroll: true });
        
        // Restore scroll position in case it moved
        window.scrollTo(scrollLeft, scrollTop);
        
        // Small delay for iOS compatibility - also prevent scroll
        setTimeout(() => {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            input.focus({ preventScroll: true });
            window.scrollTo(currentScrollLeft, currentScrollTop);
        }, 100);
    }
}

// Oculta o teclado móbil
function hideMobileKeyboard() {
    const input = document.getElementById('mobileKeyboardInput');
    if (input) {
        input.blur();
    }
}