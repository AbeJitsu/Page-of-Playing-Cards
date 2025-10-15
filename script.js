// Cool JavaScript Functionality for Playing Cards

// 1. Card flip animation on click
const cards = document.querySelectorAll('.card');

cards.forEach(card => {
  // Add flippable state
  let isFlipped = false;

  card.addEventListener('click', () => {
    isFlipped = !isFlipped;

    if (isFlipped) {
      card.style.transform = 'rotateY(180deg)';
      card.setAttribute('aria-label', card.getAttribute('aria-label') + ' - flipped');
    } else {
      card.style.transform = 'rotateY(0deg)';
      card.setAttribute('aria-label', card.getAttribute('aria-label').replace(' - flipped', ''));
    }
  });

  // 2. 3D tilt effect on mouse move
  card.addEventListener('mousemove', (e) => {
    if (isFlipped) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
  });

  card.addEventListener('mouseleave', () => {
    if (!isFlipped) {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
  });

  // 3. Keyboard support - flip on Enter or Space
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});

// 4. Shuffle animation on page load
window.addEventListener('load', () => {
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(-100px) rotate(180deg)';

    setTimeout(() => {
      card.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0) rotate(0deg)';
    }, index * 150);
  });
});

// 5. Double-click to shuffle all cards
const playingCardsContainer = document.getElementById('playing-cards');

playingCardsContainer.addEventListener('dblclick', () => {
  const cardsArray = Array.from(cards);

  // Animate cards out
  cardsArray.forEach((card, index) => {
    setTimeout(() => {
      card.style.transform = 'scale(0) rotate(360deg)';
      card.style.opacity = '0';
    }, index * 50);
  });

  // Shuffle and animate back in
  setTimeout(() => {
    // Shuffle array
    for (let i = cardsArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      playingCardsContainer.insertBefore(cardsArray[j], cardsArray[i]);
    }

    // Animate back in
    cardsArray.forEach((card, index) => {
      setTimeout(() => {
        card.style.transform = 'scale(1) rotate(0deg)';
        card.style.opacity = '1';
      }, index * 100);
    });
  }, 600);
});

// 6. Add visual feedback message
const message = document.createElement('div');
message.textContent = 'Click to flip • Double-click anywhere to shuffle';
message.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
`;
document.body.appendChild(message);
