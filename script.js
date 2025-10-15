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

    this.init();
  }

  init() {
    this.createDeck();
    this.dealCards();
    this.renderGame();
    this.attachEventListeners();
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

    // Render waste - show top 3 cards in draw-3 mode
    const wastePile = document.getElementById('waste');
    wastePile.innerHTML = '';
    if (this.waste.length > 0) {
      const cardsToShow = this.drawMode === 3 ? Math.min(3, this.waste.length) : 1;
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
    // Stock click
    document.getElementById('stock').addEventListener('click', () => this.drawFromStock());

    // New game button
    document.getElementById('new-game').addEventListener('click', () => this.newGame());

    // Undo button
    document.getElementById('undo').addEventListener('click', () => this.undo());

    // Play again button
    document.getElementById('play-again').addEventListener('click', () => this.newGame());

    // Draw mode selector
    document.getElementById('draw-select').addEventListener('change', (e) => {
      this.drawMode = parseInt(e.target.value);
      this.newGame(); // Restart game with new draw mode
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
      // Remove from source
      if (this.draggedFrom.type === 'tableau') {
        const sourceIndex = this.draggedFrom.index;
        const cardIndex = this.tableau[sourceIndex].indexOf(this.draggedCard);
        const cardsToMove = this.tableau[sourceIndex].splice(cardIndex);

        // Flip top card if needed
        if (this.tableau[sourceIndex].length > 0) {
          const topCard = this.tableau[sourceIndex][this.tableau[sourceIndex].length - 1];
          if (!topCard.faceUp) {
            topCard.faceUp = true;
          }
        }

        // Move cards
        this.tableau[targetIndex].push(...cardsToMove);
      } else if (this.draggedFrom.type === 'waste') {
        this.waste.pop();
        this.tableau[targetIndex].push(this.draggedCard);
      } else if (this.draggedFrom.type === 'foundation') {
        this.foundations[this.draggedFrom.suit].pop();
        this.tableau[targetIndex].push(this.draggedCard);
      }

      this.moveCount++;
      this.renderGame();
      this.checkWin();
    }

    this.draggedCard = null;
    this.draggedFrom = null;
  }

  moveToFoundation(targetSuit) {
    if (!this.draggedCard || !this.draggedFrom) return;

    const canMove = this.canMoveToFoundation(this.draggedCard, targetSuit);

    if (canMove) {
      // Remove from source
      if (this.draggedFrom.type === 'tableau') {
        const sourceIndex = this.draggedFrom.index;
        this.tableau[sourceIndex].pop();

        // Flip top card if needed
        if (this.tableau[sourceIndex].length > 0) {
          const topCard = this.tableau[sourceIndex][this.tableau[sourceIndex].length - 1];
          if (!topCard.faceUp) {
            topCard.faceUp = true;
          }
        }
      } else if (this.draggedFrom.type === 'waste') {
        this.waste.pop();
      }

      // Add to foundation
      this.foundations[targetSuit].push(this.draggedCard);

      this.moveCount++;
      this.renderGame();
      this.checkWin();
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

  drawFromStock() {
    if (this.stock.length > 0) {
      // Draw cards based on draw mode
      const cardsToDraw = Math.min(this.drawMode, this.stock.length);
      for (let i = 0; i < cardsToDraw; i++) {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
      }
      this.moveCount++;
      this.renderGame();
    } else if (this.waste.length > 0) {
      // Reset stock from waste
      this.stockCycles++;
      while (this.waste.length > 0) {
        const card = this.waste.pop();
        card.faceUp = false;
        this.stock.push(card);
      }
      this.renderGame();

      // Check if game might be unwinnable after cycling through stock
      if (this.stockCycles >= 3) {
        this.checkUnwinnable();
      }
    }
  }

  checkWin() {
    const allFoundationsFull = Object.values(this.foundations).every(pile => pile.length === 13);

    if (allFoundationsFull) {
      clearInterval(this.timerInterval);
      document.getElementById('win-message').style.display = 'block';
    }
  }

  checkUnwinnable() {
    // Simple heuristic: Check if there are any legal moves available
    const hasLegalMoves = this.hasAnyLegalMoves();

    if (!hasLegalMoves) {
      const message = confirm(
        'This game appears to be unwinnable. No legal moves are available.\n\n' +
        'Would you like to start a new game?'
      );

      if (message) {
        this.newGame();
      }
    }
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
              return true;
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
          return true;
        }
      }
    }

    // Check if there are face-down cards that could be revealed
    for (let i = 0; i < 7; i++) {
      const pile = this.tableau[i];
      for (const card of pile) {
        if (!card.faceUp) {
          return true; // Face-down cards might contain useful cards
        }
      }
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
    document.getElementById('win-message').style.display = 'none';
    this.init();
  }

  undo() {
    // Simplified undo - would need full move history tracking for complete implementation
    alert('Undo feature coming soon!');
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
