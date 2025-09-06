// Crossword grid generation and management - Xeración e xestión da grella do crucigrama

// Xera un novo crucigrama colocando as palabras de forma cruzada
function generateCrossword() {
    console.log('Xerando crucigrama...');
    
    // Initialize empty grid - use larger working grid
    const WORKING_GRID_SIZE = 25;
    gameState.grid = Array(WORKING_GRID_SIZE).fill().map(() => Array(WORKING_GRID_SIZE).fill(''));
    gameState.placedWords = [];
    
    // Try to place words using simple crossword algorithm
    if (gameState.words.length === 0) {
        console.error('Non hai palabras para colocar');
        return;
    }
    
    // Sort words by length (longest first for better placement)
    const sortedWords = [...gameState.words].sort((a, b) => b.palabra.length - a.palabra.length);
    
    // Place first word in center horizontally
    const firstWord = sortedWords[0];
    const centerRow = Math.floor(WORKING_GRID_SIZE / 2);
    const centerCol = Math.floor((WORKING_GRID_SIZE - firstWord.palabra.length) / 2);
    
    placeWordInCrossword(firstWord, centerRow, centerCol, 'horizontal', 1, WORKING_GRID_SIZE);
    
    // Try to place remaining words with timeout protection
    let placedCount = 1;
    const maxAttempts = sortedWords.length * 3; // Limit attempts per word
    let totalAttempts = 0;
    
    for (let i = 1; i < sortedWords.length && placedCount < 8 && totalAttempts < maxAttempts; i++) {
        const word = sortedWords[i];
        totalAttempts++;
        
        if (findAndPlaceWord(word, placedCount + 1, WORKING_GRID_SIZE)) {
            placedCount++;
        }
    }
    
    console.log(`Colocadas ${placedCount} palabras de ${sortedWords.length}`);
    
    // Update game words to only include placed words
    gameState.words = gameState.placedWords.map(pw => ({
        palabra: pw.word.palabra,
        definicion: pw.word.definicion
    }));
    
    // Calculate optimal grid bounds
    const bounds = calculateGridBounds();
    gameState.gridBounds = bounds;
    
    // Render the grid
    renderCrosswordGrid();
    
    // Update clues
    updateCrosswordClues();
}

// Calcula os límites mínimos da grella que conteñen todas as palabras
function calculateGridBounds() {
    if (gameState.placedWords.length === 0) {
        return { minRow: 0, maxRow: 10, minCol: 0, maxCol: 10 };
    }
    
    const bounds = { minRow: Infinity, maxRow: -Infinity, minCol: Infinity, maxCol: -Infinity };
    
    gameState.placedWords.forEach(placedWord => {
        placedWord.cells.forEach(cell => {
            bounds.minRow = Math.min(bounds.minRow, cell.row);
            bounds.maxRow = Math.max(bounds.maxRow, cell.row);
            bounds.minCol = Math.min(bounds.minCol, cell.col);
            bounds.maxCol = Math.max(bounds.maxCol, cell.col);
        });
    });
    
    return bounds;
}

// Atopa unha posición válida e coloca unha palabra no crucigrama (optimizado)
function findAndPlaceWord(wordObj, number, gridSize) {
    const word = wordObj.palabra;
    const MAX_INTERSECTION_ATTEMPTS = 20; // Limit intersection checks
    let attemptCount = 0;
    
    // Try to find intersections with existing words
    for (const placedWord of gameState.placedWords) {
        // Pre-calculate common letters to avoid nested loops
        const commonLetters = findCommonLetters(word, placedWord.word.palabra);
        
        for (const {newWordIndex, placedWordIndex} of commonLetters) {
            if (attemptCount++ > MAX_INTERSECTION_ATTEMPTS) return false;
            
            let newRow, newCol, direction;
            
            if (placedWord.direction === 'horizontal') {
                // Place new word vertically
                direction = 'vertical';
                newRow = placedWord.row - newWordIndex;
                newCol = placedWord.col + placedWordIndex;
            } else {
                // Place new word horizontally
                direction = 'horizontal';
                newRow = placedWord.row + placedWordIndex;
                newCol = placedWord.col - newWordIndex;
            }
            
            if (canPlaceWord(word, newRow, newCol, direction, gridSize)) {
                placeWordInCrossword(wordObj, newRow, newCol, direction, number, gridSize);
                return true;
            }
        }
    }
    
    return false;
}

// Función auxiliar para atopar letras comúns de forma eficiente
function findCommonLetters(word1, word2) {
    const commonLetters = [];
    
    for (let i = 0; i < word1.length; i++) {
        for (let j = 0; j < word2.length; j++) {
            if (word1[i] === word2[j]) {
                commonLetters.push({newWordIndex: i, placedWordIndex: j});
            }
        }
    }
    
    return commonLetters;
}

// Verifica se unha palabra pode ser colocada nunha posición dada
function canPlaceWord(word, row, col, direction, gridSize) {
    // Check boundaries
    if (direction === 'horizontal') {
        if (row < 0 || row >= gridSize || col < 0 || col + word.length > gridSize) {
            return false;
        }
        
        // Check if space is available and doesn't conflict
        let hasIntersection = false;
        for (let i = 0; i < word.length; i++) {
            const currentCell = gameState.grid[row][col + i];
            if (currentCell !== '' && currentCell !== word[i]) {
                return false;
            }
            if (currentCell === word[i]) {
                hasIntersection = true;
            }
        }
        
        // CRITICAL: Must have at least one intersection with existing words (except first word)
        if (gameState.placedWords.length > 0 && !hasIntersection) {
            return false;
        }
        
        // Enhanced adjacency check - NO consecutive words without intersection
        if (col > 0 && gameState.grid[row][col - 1] !== '') {
            return false; // Would create consecutive words
        }
        if (col + word.length < gridSize && gameState.grid[row][col + word.length] !== '') {
            return false; // Would create consecutive words
        }
        
        // Check perpendicular adjacency
        for (let i = 0; i < word.length; i++) {
            if (row > 0 && gameState.grid[row - 1][col + i] !== '' && gameState.grid[row][col + i] === '') {
                return false; // Would create isolated cell above
            }
            if (row < gridSize - 1 && gameState.grid[row + 1][col + i] !== '' && gameState.grid[row][col + i] === '') {
                return false; // Would create isolated cell below
            }
        }
        
    } else { // vertical
        if (col < 0 || col >= gridSize || row < 0 || row + word.length > gridSize) {
            return false;
        }
        
        // Check if space is available and doesn't conflict
        let hasIntersection = false;
        for (let i = 0; i < word.length; i++) {
            const currentCell = gameState.grid[row + i][col];
            if (currentCell !== '' && currentCell !== word[i]) {
                return false;
            }
            if (currentCell === word[i]) {
                hasIntersection = true;
            }
        }
        
        // CRITICAL: Must have at least one intersection with existing words (except first word)
        if (gameState.placedWords.length > 0 && !hasIntersection) {
            return false;
        }
        
        // Enhanced adjacency check - NO consecutive words without intersection
        if (row > 0 && gameState.grid[row - 1][col] !== '') {
            return false; // Would create consecutive words
        }
        if (row + word.length < gridSize && gameState.grid[row + word.length][col] !== '') {
            return false; // Would create consecutive words
        }
        
        // Check perpendicular adjacency
        for (let i = 0; i < word.length; i++) {
            if (col > 0 && gameState.grid[row + i][col - 1] !== '' && gameState.grid[row + i][col] === '') {
                return false; // Would create isolated cell to the left
            }
            if (col < gridSize - 1 && gameState.grid[row + i][col + 1] !== '' && gameState.grid[row + i][col] === '') {
                return false; // Would create isolated cell to the right
            }
        }
    }
    
    return true;
}

// Verifica se unha celda forma parte dunha palabra xa colocada
function isPartOfExistingWord(row, col) {
    return gameState.placedWords.some(placedWord =>
        placedWord.cells.some(cell => cell.row === row && cell.col === col)
    );
}

// Coloca unha palabra no crucigrama nunha posición específica
function placeWordInCrossword(wordObj, row, col, direction, number, gridSize) {
    const word = wordObj.palabra;
    
    // Place letters in grid
    for (let i = 0; i < word.length; i++) {
        if (direction === 'horizontal') {
            gameState.grid[row][col + i] = word[i];
        } else {
            gameState.grid[row + i][col] = word[i];
        }
    }
    
    // Store placed word info
    gameState.placedWords.push({
        word: wordObj,
        row: row,
        col: col,
        direction: direction,
        number: number,
        cells: generateWordCells(row, col, word.length, direction)
    });
    
    console.log(`Colocada palabra "${word}" en (${row},${col}) ${direction} - número ${number}`);
}

// Xera as posicións das celdas para unha palabra
function generateWordCells(row, col, length, direction) {
    const cells = [];
    for (let i = 0; i < length; i++) {
        if (direction === 'horizontal') {
            cells.push({ row: row, col: col + i });
        } else {
            cells.push({ row: row + i, col: col });
        }
    }
    return cells;
}

// Renderiza a grella do crucigrama no DOM
function renderCrosswordGrid() {
    const gridContainer = document.getElementById('gameGrid');
    if (!gridContainer) return;
    
    // Clear existing grid
    gridContainer.innerHTML = '';
    
    // Use calculated bounds
    const bounds = gameState.gridBounds;
    const rows = bounds.maxRow - bounds.minRow + 1;
    const cols = bounds.maxCol - bounds.minCol + 1;
    
    // Set dynamic grid size using CSS Grid
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    // Create grid cells only for the visible area
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Check if this cell is part of any word
            const cellInfo = getCellInfo(row, col);
            
            if (cellInfo.isUsed) {
                // This cell is part of a word
                cell.classList.add('crossword-cell');
                
                // Add number if it's the start of a word
                if (cellInfo.number) {
                    const numberSpan = document.createElement('span');
                    numberSpan.className = 'cell-number';
                    numberSpan.textContent = cellInfo.number;
                    cell.appendChild(numberSpan);
                }
                
                // Add click event for word selection
                cell.addEventListener('click', () => handleCellClick(row, col));
                
            } else {
                // This cell is blocked
                cell.classList.add('blocked');
            }
            
            gridContainer.appendChild(cell);
        }
    }
}

// Obtén información sobre unha celda específica (se contén palabras, números, etc.)
function getCellInfo(row, col) {
    const info = { isUsed: false, number: null, words: [] };
    
    // Check all placed words
    gameState.placedWords.forEach(placedWord => {
        const isInWord = placedWord.cells.some(cell => cell.row === row && cell.col === col);
        
        if (isInWord) {
            info.isUsed = true;
            info.words.push(placedWord);
            
            // Check if this is the starting cell of the word
            if (placedWord.row === row && placedWord.col === col) {
                info.number = placedWord.number;
            }
        }
    });
    
    return info;
}

// Xestiona o clic nunha celda para selección de palabras
function handleCellClick(row, col) {
    if (!gameState.isGameActive) return;
    
    const cellInfo = getCellInfo(row, col);
    
    if (cellInfo.words.length === 0) return;
    
    // If multiple words intersect, cycle through them
    if (cellInfo.words.length === 1) {
        selectWord(cellInfo.words[0]);
    } else {
        // Find current selected word and select next one
        let currentIndex = cellInfo.words.findIndex(w => w === gameState.selectedWord);
        currentIndex = (currentIndex + 1) % cellInfo.words.length;
        selectWord(cellInfo.words[currentIndex]);
    }
    
    // Show mobile keyboard by focusing a hidden input
    showMobileKeyboard();
}

// Selecciona unha palabra para a entrada de texto
function selectWord(placedWord) {
    if (!placedWord) return;
    
    // Clear previous selection
    clearSelection();
    
    // Set new selection
    gameState.selectedWord = placedWord.word;
    gameState.selectedCells = placedWord.cells;
    gameState.currentInput = '';
    
    // Highlight selected word cells
    placedWord.cells.forEach((cell, index) => {
        const cellElement = getCellElement(cell.row, cell.col);
        if (cellElement) {
            if (index === 0) {
                cellElement.classList.add('active');
            } else {
                cellElement.classList.add('highlight');
            }
        }
    });
    
    // Highlight corresponding clue
    const clueElement = document.querySelector(`[data-word="${placedWord.word.palabra}"]`);
    if (clueElement) {
        clueElement.classList.add('active');
    }
    
    console.log('Selected word:', placedWord.word.palabra);
    
    // Mobile keyboard will be shown when user starts typing to avoid scroll
}

// Actualiza a visualización das pistas do crucigrama
function updateCrosswordClues() {
    const horizontalClues = document.getElementById('horizontalClues');
    const verticalClues = document.getElementById('verticalClues');
    
    if (!horizontalClues || !verticalClues) return;
    
    horizontalClues.innerHTML = '';
    verticalClues.innerHTML = '';
    
    // Separate horizontal and vertical words
    const horizontalWords = gameState.placedWords.filter(pw => pw.direction === 'horizontal');
    const verticalWords = gameState.placedWords.filter(pw => pw.direction === 'vertical');
    
    // Sort by number
    horizontalWords.sort((a, b) => a.number - b.number);
    verticalWords.sort((a, b) => a.number - b.number);
    
    // Create horizontal clues
    horizontalWords.forEach(placedWord => {
        const li = document.createElement('li');
        li.className = 'clue-item';
        li.dataset.word = placedWord.word.palabra;
        li.innerHTML = `<span class="clue-number">${placedWord.number}.</span>${placedWord.word.definicion}`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            selectWord(placedWord);
            // Don't show mobile keyboard immediately to avoid scroll
        });
        horizontalClues.appendChild(li);
    });
    
    // Create vertical clues
    verticalWords.forEach(placedWord => {
        const li = document.createElement('li');
        li.className = 'clue-item';
        li.dataset.word = placedWord.word.palabra;
        li.innerHTML = `<span class="clue-number">${placedWord.number}.</span>${placedWord.word.definicion}`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            selectWord(placedWord);
            // Don't show mobile keyboard immediately to avoid scroll
        });
        verticalClues.appendChild(li);
    });
    
    // Update total count
    const totalCount = document.getElementById('totalCount');
    if (totalCount) {
        totalCount.textContent = gameState.placedWords.length;
    }
}

// Verifica se o crucigrama está completado
function checkCrosswordCompletion() {
    const allWordsFound = gameState.placedWords.every(placedWord => 
        gameState.foundWords.some(foundWord => foundWord.palabra === placedWord.word.palabra)
    );
    
    if (allWordsFound && gameState.isGameActive) {
        setTimeout(() => endGame(true), 500);
    }
}