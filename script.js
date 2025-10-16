// Solitaire Game Implementation

class SolitaireGame {
  constructor() {
    this.suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    this.suitSymbols = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.rankValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

    this.stock = [];
    this.waste = [];
    this.foundations = { spades: [], hearts: [], diamonds: [], clubs: [] };
    this.tableau = [[], [], [], [], [], [], []];

    this.moveHistory = [];
    this.moveCount = 0;
    this.startTime = null;
    this.timerInterval = null;
    this.draggedCard = null;
    this.draggedFrom = null;
    this.drawMode = 3; // 1 or 3 cards
    this.stockCycles = 0; // Track how many times through the stock
    this.movesSinceLastCycle = 0; // Track moves between cycles
    this.lastGameStateHash = ''; // Track game state for unwinnable detection

    this.init();
    this.attachEventListeners(); // Attach listeners only once in constructor
  }

  init() {
    this.createDeck();
    this.dealCards();
    this.renderGame();
    this.updateUndoButton();
    this.updateAutoCompleteButton();
    this.startTimer();
  }

  createDeck() {
    const deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push({
          suit,
          rank,
          faceUp: false,
          element: null
        });
      }
    }
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.stock = deck;
  }

  dealCards() {
    // Deal to tableau
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = this.stock.pop();
        if (i === j) {
          card.faceUp = true;
        }
        this.tableau[j].push(card);
      }
    }
  }

  createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    if (card.faceUp) {
      if (card.suit === 'hearts' || card.suit === 'diamonds') {
        cardEl.classList.add('red');
      }

      const suitSymbol = this.suitSymbols[card.suit];
      cardEl.innerHTML = `
        <div class="left">
          <span class="value" aria-hidden="true">${card.rank}</span>
          <span class="suit" aria-hidden="true">${suitSymbol}</span>
        </div>
        <div class="middle">
          <span class="suit-large" aria-hidden="true">${suitSymbol}</span>
        </div>
        <div class="right">
          <span class="suit" aria-hidden="true">${suitSymbol}</span>
        </div>
      `;
      cardEl.setAttribute('role', 'img');
      cardEl.setAttribute('aria-label', `${card.rank} of ${card.suit}`);
      cardEl.setAttribute('tabindex', '0');
      cardEl.draggable = true;
    } else {
      cardEl.classList.add('face-down');
      cardEl.setAttribute('aria-label', 'Face-down card');
      cardEl.draggable = false;
    }

    card.element = cardEl;
    cardEl.cardData = card;

    return cardEl;
  }

  renderGame() {
    // Render tableau
    document.querySelectorAll('.tableau-pile').forEach((pile, index) => {
      pile.innerHTML = '';
      this.tableau[index].forEach((card, cardIndex) => {
        const cardEl = this.createCardElement(card);
        cardEl.style.top = `${cardIndex * 30}px`;
        pile.appendChild(cardEl);
      });
    });

    // Render stock
    const stockPile = document.getElementById('stock');
    stockPile.innerHTML = '';
    if (this.stock.length > 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'card face-down';
      placeholder.style.position = 'relative';
      stockPile.appendChild(placeholder);
    }

    // Render waste - always show up to 3 cards for better visibility
    const wastePile = document.getElementById('waste');
    wastePile.style.width = this.drawMode === 3 ? '12.5rem' : '7.5rem';
    wastePile.innerHTML = '';
    if (this.waste.length > 0) {
      const cardsToShow = Math.min(3, this.waste.length); // Always show up to 3 cards
      const startIndex = Math.max(0, this.waste.length - cardsToShow);

      for (let i = startIndex; i < this.waste.length; i++) {
        const card = this.waste[i];
        card.faceUp = true;
        const cardEl = this.createCardElement(card);
        const offset = (i - startIndex) * 40; // Offset each card
        cardEl.style.position = 'absolute';
        cardEl.style.left = `${offset}px`;
        cardEl.style.zIndex = i - startIndex;
        if (i < this.waste.length - 1) {
          cardEl.draggable = false; // Only top card is draggable
        }
        wastePile.appendChild(cardEl);
      }
    }

    // Render foundations
    document.querySelectorAll('.foundation').forEach(pile => {
      const suit = pile.dataset.suit;
      pile.innerHTML = '';

      if (this.foundations[suit].length > 0) {
        const topCard = this.foundations[suit][this.foundations[suit].length - 1];
        const cardEl = this.createCardElement(topCard);
        cardEl.style.position = 'relative';
        pile.appendChild(cardEl);
      }
    });

    // Update move count
    document.getElementById('move-count').textContent = this.moveCount;
  }

  attachEventListeners() {
    // Stock click and keyboard
    const stockPile = document.getElementById('stock');
    stockPile.addEventListener('click', () => this.drawFromStock());
    stockPile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.drawFromStock();
      }
    });

    // New game button
    document.getElementById('new-game').addEventListener('click', () => this.newGame());

    // Undo button
    document.getElementById('undo').addEventListener('click', () => this.undo());

    // Auto-complete button
    const autoCompleteBtn = document.getElementById('auto-complete');
    if (autoCompleteBtn) {
      autoCompleteBtn.addEventListener('click', () => this.autoComplete());
    }

    // Play again button
    const playAgainBtn = document.getElementById('play-again');
    playAgainBtn.addEventListener('click', () => this.newGame());

    // Draw mode selector
    document.getElementById('draw-select').addEventListener('change', (e) => {
      this.drawMode = parseInt(e.target.value);
      this.announceToScreenReader('Starting new game with Draw ' + this.drawMode + ' mode');
      this.newGame(); // Restart game with new draw mode
    });

    // Unwinnable dialog buttons
    const newGameUnwinnableBtn = document.getElementById('new-game-unwinnable');
    const continueAnywayBtn = document.getElementById('continue-anyway');
    const switchToDraw1Btn = document.getElementById('switch-to-draw1');

    if (newGameUnwinnableBtn) {
      newGameUnwinnableBtn.addEventListener('click', () => {
        this.hideUnwinnableDialog();
        this.newGame();
      });
    }

    if (switchToDraw1Btn) {
      switchToDraw1Btn.addEventListener('click', () => {
        // Change to Draw-1 mode WITHOUT restarting game
        this.drawMode = 1;

        // Update the select dropdown to reflect change
        const drawSelect = document.getElementById('draw-select');
        if (drawSelect) {
          drawSelect.value = '1';
        }

        // Hide dialog
        this.hideUnwinnableDialog();

        // Reset stock cycles to give fresh chance with new mode
        this.stockCycles = 0;
        this.movesSinceLastCycle = 0;

        // Re-render with new draw mode
        this.renderGame();

        // Announce to screen reader
        this.announceToScreenReader('Switched to Draw-1 mode. You can now see all cards one at a time.');
      });
    }

    if (continueAnywayBtn) {
      continueAnywayBtn.addEventListener('click', () => {
        // Reset move counter to give player a fresh chance
        this.movesSinceLastCycle = 0;
        this.hideUnwinnableDialog();
      });
    }

    // Close modal on backdrop click
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.hideUnwinnableDialog();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // ESC key to close modals
      if (e.key === 'Escape') {
        const unwinnableDialog = document.getElementById('unwinnable-message');
        if (unwinnableDialog && unwinnableDialog.style.display === 'block') {
          this.hideUnwinnableDialog();
        }
      }

      // Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }

      // Ctrl+A (Windows/Linux) or Cmd+A (Mac) to auto-complete
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const btn = document.getElementById('auto-complete');
        if (btn && !btn.disabled) {
          this.autoComplete();
        }
      }
    });

    // Drag and drop
    document.addEventListener('dragstart', (e) => this.handleDragStart(e));
    document.addEventListener('dragover', (e) => this.handleDragOver(e));
    document.addEventListener('drop', (e) => this.handleDrop(e));
    document.addEventListener('dragend', (e) => this.handleDragEnd(e));
    document.addEventListener('dragleave', (e) => this.handleDragLeave(e));

    // Double-click to auto-move to foundation
    document.addEventListener('dblclick', (e) => {
      if (e.target.closest('.card') && !e.target.closest('.card').classList.contains('face-down')) {
        const card = e.target.closest('.card').cardData;
        this.tryAutoMoveToFoundation(card);
      }
    });
  }

  handleDragStart(e) {
    const cardEl = e.target.closest('.card');
    if (!cardEl || cardEl.classList.contains('face-down')) return;

    cardEl.classList.add('dragging');
    this.draggedCard = cardEl.cardData;

    // Determine where the card is being dragged from
    const pile = cardEl.closest('.pile');
    if (pile.classList.contains('tableau-pile')) {
      this.draggedFrom = { type: 'tableau', index: parseInt(pile.dataset.pile) };
    } else if (pile.id === 'waste') {
      this.draggedFrom = { type: 'waste' };
    } else if (pile.classList.contains('foundation')) {
      this.draggedFrom = { type: 'foundation', suit: pile.dataset.suit };
    }

    e.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(e) {
    e.preventDefault();
    const pile = e.target.closest('.pile');
    if (pile) {
      pile.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    const pile = e.target.closest('.pile');
    if (pile && !pile.contains(e.relatedTarget)) {
      pile.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const pile = e.target.closest('.pile');
    if (!pile) return;

    pile.classList.remove('drag-over');

    // Determine drop target
    if (pile.classList.contains('tableau-pile')) {
      const targetIndex = parseInt(pile.dataset.pile);
      this.moveToTableau(targetIndex);
    } else if (pile.classList.contains('foundation')) {
      const targetSuit = pile.dataset.suit;
      this.moveToFoundation(targetSuit);
    }
  }

  handleDragEnd(e) {
    const cardEl = e.target.closest('.card');
    if (cardEl) {
      cardEl.classList.remove('dragging');
    }
    document.querySelectorAll('.pile').forEach(p => p.classList.remove('drag-over'));
  }

  moveToTableau(targetIndex) {
    if (!this.draggedCard || !this.draggedFrom) return;

    const targetPile = this.tableau[targetIndex];
    const canMove = this.canMoveToTableau(this.draggedCard, targetPile);

    if (canMove) {
      let cardsToMove = [];
      let flippedCard = null;

      // Remove from source
      if (this.draggedFrom.type === 'tableau') {
        const sourceIndex = this.draggedFrom.index;
        const cardIndex = this.tableau[sourceIndex].indexOf(this.draggedCard);
        cardsToMove = this.tableau[sourceIndex].splice(cardIndex);

        // Flip top card if needed
        if (this.tableau[sourceIndex].length > 0) {
          const topCard = this.tableau[sourceIndex][this.tableau[sourceIndex].length - 1];
          if (!topCard.faceUp) {
            topCard.faceUp = true;
            flippedCard = topCard;
          }
        }

        // Move cards
        this.tableau[targetIndex].push(...cardsToMove);
      } else if (this.draggedFrom.type === 'waste') {
        cardsToMove = [this.draggedCard];
        this.waste.pop();
        this.tableau[targetIndex].push(this.draggedCard);
      } else if (this.draggedFrom.type === 'foundation') {
        cardsToMove = [this.draggedCard];
        this.foundations[this.draggedFrom.suit].pop();
        this.tableau[targetIndex].push(this.draggedCard);
      }

      // Track move for undo
      this.moveHistory.push({
        type: 'to-tableau',
        from: { ...this.draggedFrom },
        to: { type: 'tableau', index: targetIndex },
        cards: cardsToMove,
        flippedCard: flippedCard
      });

      this.moveCount++;
      this.movesSinceLastCycle++;
      this.updateUndoButton();
      this.updateAutoCompleteButton();
      this.renderGame();
      this.checkWin();

      // Check if stuck after this move (with small delay)
      setTimeout(() => this.checkIfStuck(), 500);
    }

    this.draggedCard = null;
    this.draggedFrom = null;
  }

  moveToFoundation(targetSuit) {
    if (!this.draggedCard || !this.draggedFrom) return;

    const canMove = this.canMoveToFoundation(this.draggedCard, targetSuit);

    if (canMove) {
      let flippedCard = null;

      // Remove from source
      if (this.draggedFrom.type === 'tableau') {
        const sourceIndex = this.draggedFrom.index;
        this.tableau[sourceIndex].pop();

        // Flip top card if needed
        if (this.tableau[sourceIndex].length > 0) {
          const topCard = this.tableau[sourceIndex][this.tableau[sourceIndex].length - 1];
          if (!topCard.faceUp) {
            topCard.faceUp = true;
            flippedCard = topCard;
          }
        }
      } else if (this.draggedFrom.type === 'waste') {
        this.waste.pop();
      }

      // Add to foundation
      this.foundations[targetSuit].push(this.draggedCard);

      // Track move for undo
      this.moveHistory.push({
        type: 'to-foundation',
        from: { ...this.draggedFrom },
        to: { type: 'foundation', suit: targetSuit },
        card: this.draggedCard,
        flippedCard: flippedCard
      });

      this.moveCount++;
      this.movesSinceLastCycle++;
      this.updateUndoButton();
      this.updateAutoCompleteButton();
      this.renderGame();
      this.checkWin();

      // Check if stuck after this move (with small delay)
      setTimeout(() => this.checkIfStuck(), 500);
    }

    this.draggedCard = null;
    this.draggedFrom = null;
  }

  canMoveToTableau(card, targetPile) {
    if (targetPile.length === 0) {
      return this.rankValues[card.rank] === 13; // Only King can go on empty tableau
    }

    const targetCard = targetPile[targetPile.length - 1];
    if (!targetCard.faceUp) return false;

    const cardColor = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
    const targetColor = (targetCard.suit === 'hearts' || targetCard.suit === 'diamonds') ? 'red' : 'black';

    const cardValue = this.rankValues[card.rank];
    const targetValue = this.rankValues[targetCard.rank];

    return cardColor !== targetColor && cardValue === targetValue - 1;
  }

  canMoveToFoundation(card, targetSuit) {
    if (card.suit !== targetSuit) return false;

    const foundation = this.foundations[targetSuit];

    if (foundation.length === 0) {
      return card.rank === 'A';
    }

    const topCard = foundation[foundation.length - 1];
    const cardValue = this.rankValues[card.rank];
    const topValue = this.rankValues[topCard.rank];

    return cardValue === topValue + 1;
  }

  tryAutoMoveToFoundation(card) {
    const canMove = this.canMoveToFoundation(card, card.suit);

    if (canMove) {
      // Find where the card is
      for (let i = 0; i < 7; i++) {
        const pile = this.tableau[i];
        if (pile.length > 0 && pile[pile.length - 1] === card) {
          this.draggedCard = card;
          this.draggedFrom = { type: 'tableau', index: i };
          this.moveToFoundation(card.suit);
          return;
        }
      }

      if (this.waste.length > 0 && this.waste[this.waste.length - 1] === card) {
        this.draggedCard = card;
        this.draggedFrom = { type: 'waste' };
        this.moveToFoundation(card.suit);
      }
    }
  }

  autoComplete() {
    // Don't run if not auto-completable
    if (!this.isAutoCompletable()) {
      return;
    }

    // Disable the button during execution
    const btn = document.getElementById('auto-complete');
    if (btn) {
      btn.disabled = true;
    }

    // Announce to screen readers
    this.announceToScreenReader('Auto-completing game. Moving all cards to foundations.');

    // Start recursive animation
    this.autoCompleteStep();
  }

  autoCompleteStep() {
    // Find the lowest card that can move to foundation
    let cardToMove = null;
    let sourceIndex = -1;

    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        if (this.canMoveToFoundation(topCard, topCard.suit)) {
          // Prioritize lower-value cards (move Aces before Kings)
          if (!cardToMove || this.rankValues[topCard.rank] < this.rankValues[cardToMove.rank]) {
            cardToMove = topCard;
            sourceIndex = i;
          }
        }
      }
    }

    // If found a card to move, move it
    if (cardToMove && sourceIndex >= 0) {
      this.draggedCard = cardToMove;
      this.draggedFrom = { type: 'tableau', index: sourceIndex };
      this.moveToFoundation(cardToMove.suit);

      // Continue after 150ms delay for smooth animation
      setTimeout(() => this.autoCompleteStep(), 150);
    } else {
      // No more moves - we're done
      this.updateAutoCompleteButton();

      // Check if we won (slight delay for final card animation)
      setTimeout(() => this.checkWin(), 300);
    }
  }

  drawFromStock() {
    if (this.stock.length > 0) {
      // Draw cards based on draw mode
      const cardsToDraw = Math.min(this.drawMode, this.stock.length);
      const drawnCards = [];

      for (let i = 0; i < cardsToDraw; i++) {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
        drawnCards.push(card);
      }

      // Track move for undo
      this.moveHistory.push({
        type: 'draw',
        count: cardsToDraw,
        cards: drawnCards
      });

      this.moveCount++;
      this.updateUndoButton();
      this.updateAutoCompleteButton();
      this.renderGame();

      // Check if stuck after drawing (with small delay)
      setTimeout(() => this.checkIfStuck(), 300);
    } else if (this.waste.length > 0) {
      // Reset stock from waste - proper Solitaire order
      this.stockCycles++;

      // Check for unwinnable BEFORE resetting if no moves made
      if (this.movesSinceLastCycle === 0 && this.stockCycles > 0) {
        // Went through entire stock without making a move
        this.checkUnwinnable();
        if (this.stock.length === 0 && this.waste.length > 0) {
          // Only reset if user didn't start new game
          this.resetStockFromWaste();
        }
      } else {
        this.resetStockFromWaste();
      }

      this.movesSinceLastCycle = 0;
    }
  }

  resetStockFromWaste() {
    // Properly reverse waste pile back to stock
    // This ensures different cards are accessible on each cycle
    const wasteCards = [...this.waste];
    this.waste = [];
    this.stock = wasteCards.reverse();

    // Turn all cards face-down
    this.stock.forEach(card => card.faceUp = false);

    this.renderGame();
  }

  checkWin() {
    const allFoundationsFull = Object.values(this.foundations).every(pile => pile.length === 13);

    if (allFoundationsFull) {
      clearInterval(this.timerInterval);
      const winDialog = document.getElementById('win-message');
      winDialog.style.display = 'block';

      // Focus management - focus the "Play Again" button
      setTimeout(() => {
        document.getElementById('play-again').focus();
      }, 100);

      this.announceToScreenReader('Congratulations! You won the game!');
    }
  }

  announceToScreenReader(message) {
    const announcer = document.getElementById('status-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
    }
  }

  updateUndoButton() {
    const undoBtn = document.getElementById('undo');
    if (undoBtn) {
      if (this.moveHistory.length === 0) {
        undoBtn.setAttribute('aria-disabled', 'true');
        undoBtn.disabled = true;
      } else {
        undoBtn.setAttribute('aria-disabled', 'false');
        undoBtn.disabled = false;
      }
    }
  }

  updateAutoCompleteButton() {
    const btn = document.getElementById('auto-complete');
    if (btn) {
      if (this.isAutoCompletable()) {
        btn.setAttribute('aria-disabled', 'false');
        btn.disabled = false;
      } else {
        btn.setAttribute('aria-disabled', 'true');
        btn.disabled = true;
      }
    }
  }

  checkUnwinnable() {
    // Simple heuristic: Check if there are any legal moves available
    const hasLegalMoves = this.hasAnyLegalMoves();

    if (!hasLegalMoves) {
      this.showUnwinnableDialog();
    }
  }

  checkIfStuck() {
    // Don't check if modals are open or game is won
    const winMessage = document.getElementById('win-message');
    const unwinnableMessage = document.getElementById('unwinnable-message');

    if (winMessage && winMessage.style.display === 'block') return;
    if (unwinnableMessage && unwinnableMessage.style.display === 'block') return;

    // Only check if we've explored the stock at least once
    if (this.stockCycles === 0 && this.stock.length > 0) return;

    // Check if there are any legal moves
    const hasLegalMoves = this.hasAnyLegalMoves();

    if (!hasLegalMoves) {
      this.showUnwinnableDialog();
    }
  }

  showUnwinnableDialog() {
    const dialog = document.getElementById('unwinnable-message');
    const backdrop = document.getElementById('modal-backdrop');
    const description = dialog ? dialog.querySelector('.modal-description') : null;
    const switchBtn = document.getElementById('switch-to-draw1');

    // Update message and button visibility based on draw mode
    if (this.drawMode === 3) {
      if (description) {
        description.textContent = 'This game appears unwinnable in Draw-3 mode. Try switching to Draw-1 to see all cards.';
      }
      if (switchBtn) {
        switchBtn.style.display = 'inline-block';
      }
    } else {
      if (description) {
        description.textContent = 'This game appears to be unwinnable. No legal moves are available.';
      }
      if (switchBtn) {
        switchBtn.style.display = 'none';
      }
    }

    // Show dialog and backdrop
    if (dialog) {
      dialog.style.display = 'block';
    }
    if (backdrop) {
      backdrop.style.display = 'block';
    }

    // Prevent body scroll
    document.body.classList.add('modal-open');

    // Focus management - focus the "Switch to Draw-1" button if visible, otherwise "New Game"
    setTimeout(() => {
      if (this.drawMode === 3 && switchBtn) {
        switchBtn.focus();
      } else {
        const newGameBtn = document.getElementById('new-game-unwinnable');
        if (newGameBtn) {
          newGameBtn.focus();
        }
      }
    }, 100);

    // Announce to screen readers
    if (this.drawMode === 3) {
      this.announceToScreenReader('Game appears unwinnable in Draw-3 mode. Try switching to Draw-1 to see all cards.');
    } else {
      this.announceToScreenReader('Game appears unwinnable. No legal moves available.');
    }
  }

  hideUnwinnableDialog() {
    const dialog = document.getElementById('unwinnable-message');
    const backdrop = document.getElementById('modal-backdrop');

    if (dialog) {
      dialog.style.display = 'none';
    }
    if (backdrop) {
      backdrop.style.display = 'none';
    }

    // Restore body scroll
    document.body.classList.remove('modal-open');
  }

  isMoveProductive(sourceIndex, targetIndex) {
    const sourcePile = this.tableau[sourceIndex];
    const targetPile = this.tableau[targetIndex];

    // Moving to empty pile is always productive (creates space for Kings elsewhere)
    if (targetPile.length === 0) {
      return true;
    }

    // Check if move reveals a face-down card in source pile
    if (sourcePile.length > 1) {
      const cardBelow = sourcePile[sourcePile.length - 2];
      if (!cardBelow.faceUp) {
        return true; // Will reveal face-down card
      }
    }

    // Check if target pile has face-down cards
    // Building on a pile with hidden cards is potentially productive
    const targetHasFaceDown = targetPile.some(card => !card.faceUp);
    if (targetHasFaceDown) {
      return true;
    }

    // Non-productive: both piles are fully face-up with no cards below to reveal
    // This catches infinite loops like 7♣ ↔ 8♥
    return false;
  }

  isAutoCompletable() {
    // Must have no cards in stock or waste
    if (this.stock.length > 0 || this.waste.length > 0) {
      return false;
    }

    // All tableau cards must be face-up
    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      for (const card of pile) {
        if (!card.faceUp) {
          return false; // Found a face-down card
        }
      }
    }

    // Must have at least one card to move to foundations
    let hasCardsToMove = false;
    for (let i = 0; i < 7; i++) {
      if (this.tableau[i].length > 0) {
        hasCardsToMove = true;
        break;
      }
    }

    return hasCardsToMove;
  }

  hasAnyLegalMoves() {
    // Check if any tableau cards can move to foundations
    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        if (topCard.faceUp && this.canMoveToFoundation(topCard, topCard.suit)) {
          return true;
        }
      }
    }

    // Check if waste card can move to foundation
    if (this.waste.length > 0) {
      const wasteCard = this.waste[this.waste.length - 1];
      if (this.canMoveToFoundation(wasteCard, wasteCard.suit)) {
        return true;
      }
    }

    // Check if any tableau cards can move to other tableau piles
    for (let i = 0; i < 7; i++) {
      const sourcePile = this.tableau[i];
      if (sourcePile.length > 0) {
        const topCard = sourcePile[sourcePile.length - 1];
        if (topCard.faceUp) {
          for (let j = 0; j < 7; j++) {
            if (i !== j && this.canMoveToTableau(topCard, this.tableau[j])) {
              // Only count as legal move if it's productive
              if (this.isMoveProductive(i, j)) {
                return true;
              }
            }
          }
        }
      }
    }

    // Check if waste card can move to tableau
    if (this.waste.length > 0) {
      const wasteCard = this.waste[this.waste.length - 1];
      for (let i = 0; i < 7; i++) {
        if (this.canMoveToTableau(wasteCard, this.tableau[i])) {
          // Moving from waste is generally productive (clears waste pile)
          // But be strict: only allow if moving to empty pile or pile with face-down cards
          const targetPile = this.tableau[i];
          if (targetPile.length === 0 || targetPile.some(card => !card.faceUp)) {
            return true;
          }
        }
      }
    }

    // Check if there are face-down cards that COULD be revealed
    // (only return true if a face-down card exists AND there's a way to reveal it)
    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      if (pile.length > 0) {
        // Check if top card can be moved (which would reveal a face-down card)
        const topCard = pile[pile.length - 1];
        if (topCard.faceUp) {
          // Check if there's a face-down card below
          const hasFaceDown = pile.some(card => !card.faceUp);
          if (hasFaceDown) {
            // Check if we can move the top card anywhere (productively)
            for (let j = 0; j < 7; j++) {
              if (i !== j && this.canMoveToTableau(topCard, this.tableau[j])) {
                // Use productivity check for consistency
                if (this.isMoveProductive(i, j)) {
                  return true; // Can reveal face-down card
                }
              }
            }
            if (this.canMoveToFoundation(topCard, topCard.suit)) {
              return true; // Can reveal face-down card
            }
          }
        }
      }
    }

    // Check if ANY cards in stock/waste could potentially help
    if (this.stock.length > 0 || this.waste.length > 0) {
      // Both draw modes need 2 cycles to confirm unwinnable
      // Even in Draw-1, moves made during first cycle can reveal new opportunities
      const cyclesNeeded = 2;

      // If we've cycled enough times with no moves, stock won't help
      if (this.stockCycles >= cyclesNeeded && this.movesSinceLastCycle === 0) {
        return false; // Already tried all accessible stock cards with no success
      }
      return true; // Haven't fully explored stock yet
    }

    return false;
  }

  newGame() {
    clearInterval(this.timerInterval);
    this.stock = [];
    this.waste = [];
    this.foundations = { spades: [], hearts: [], diamonds: [], clubs: [] };
    this.tableau = [[], [], [], [], [], [], []];
    this.moveHistory = [];
    this.moveCount = 0;
    this.startTime = null;
    this.stockCycles = 0;
    this.movesSinceLastCycle = 0;
    this.lastGameStateHash = '';
    document.getElementById('win-message').style.display = 'none';
    this.init();
  }

  undo() {
    if (this.moveHistory.length === 0) return;

    // Don't allow undo if modals are open
    const winMessage = document.getElementById('win-message');
    const unwinnableMessage = document.getElementById('unwinnable-message');
    if ((winMessage && winMessage.style.display === 'block') ||
        (unwinnableMessage && unwinnableMessage.style.display === 'block')) {
      return;
    }

    const lastMove = this.moveHistory.pop();

    // Reverse the move based on type
    switch (lastMove.type) {
      case 'draw':
        // Move cards from waste back to stock
        for (let i = 0; i < lastMove.count; i++) {
          const card = this.waste.pop();
          card.faceUp = false;
          this.stock.push(card);
        }
        break;

      case 'to-tableau':
        // Move cards back from tableau to source
        const targetIndex = lastMove.to.index;
        const cardsToMoveBack = this.tableau[targetIndex].splice(-lastMove.cards.length);

        if (lastMove.from.type === 'tableau') {
          // Move back to tableau
          this.tableau[lastMove.from.index].push(...cardsToMoveBack);

          // Unflip card if one was flipped
          if (lastMove.flippedCard) {
            lastMove.flippedCard.faceUp = false;
          }
        } else if (lastMove.from.type === 'waste') {
          // Move back to waste
          this.waste.push(cardsToMoveBack[0]);
        } else if (lastMove.from.type === 'foundation') {
          // Move back to foundation
          this.foundations[lastMove.from.suit].push(cardsToMoveBack[0]);
        }
        break;

      case 'to-foundation':
        // Move card from foundation back to source
        const card = this.foundations[lastMove.to.suit].pop();

        if (lastMove.from.type === 'tableau') {
          // Move back to tableau
          this.tableau[lastMove.from.index].push(card);

          // Unflip card if one was flipped
          if (lastMove.flippedCard) {
            lastMove.flippedCard.faceUp = false;
          }
        } else if (lastMove.from.type === 'waste') {
          // Move back to waste
          this.waste.push(card);
        }
        break;
    }

    // Update counters
    this.moveCount--;
    if (this.movesSinceLastCycle > 0) {
      this.movesSinceLastCycle--;
    }

    // Update UI
    this.updateUndoButton();
    this.updateAutoCompleteButton();
    this.renderGame();
    this.announceToScreenReader('Move undone');
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SolitaireGame();
});
