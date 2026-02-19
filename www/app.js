/**
 * AI for Grandmas — Card Swipe App
 *
 * Loads daily card deck from JSON, renders cards with generative art,
 * handles swipe navigation, streak tracking, and PWA install.
 */

(function () {
  'use strict';

  // ── Config ──
  const DATA_URL = 'data/latest.json';
  const STORAGE_KEY = 'afg_data';

  // ── DOM refs ──
  const loadingScreen = document.getElementById('loadingScreen');
  const cardWrapper = document.getElementById('cardWrapper');
  const cardCounter = document.getElementById('cardCounter');
  const progressBar = document.getElementById('progressBar');
  const streakBadge = document.getElementById('streakBadge');
  const streakCountEl = document.getElementById('streakCount');
  const swipeHint = document.getElementById('swipeHint');
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installDismiss = document.getElementById('installDismiss');

  let swiper = null;
  let totalCards = 0;

  // ── Storage helpers ──
  function getData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
  }

  function setData(obj) {
    const current = getData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...obj }));
  }

  // ── Streak Logic ──
  function updateStreak() {
    const data = getData();
    const today = new Date().toISOString().slice(0, 10);

    if (data.lastVisit === today) {
      // Already visited today
      return data.streak || 1;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = 1;

    if (data.lastVisit === yesterday) {
      streak = (data.streak || 1) + 1;
    }

    setData({ lastVisit: today, streak: streak });

    // Track total cards swiped
    const totalSwiped = (data.totalSwiped || 0);
    setData({ totalSwiped: totalSwiped });

    return streak;
  }

  function trackSwipe() {
    const data = getData();
    setData({ totalSwiped: (data.totalSwiped || 0) + 1 });
  }

  function showStreak(streak) {
    if (streak >= 2) {
      streakBadge.classList.remove('hidden');
      streakCountEl.textContent = `Day ${streak}`;
    }
  }

  // ── Swipe Hint (first visit only) ──
  function checkFirstVisit() {
    const data = getData();
    if (data.hasVisited) {
      swipeHint.classList.add('hidden');
    } else {
      setData({ hasVisited: true });
    }
  }

  // ── Build Card HTML ──
  function buildCardSlide(card) {
    // Use AI-generated image if available, fall back to generative SVG
    const artHtml = card.image_url
      ? `<img src="${escapeHtml(card.image_url)}" alt="${escapeHtml(card.title)}" class="card-art-image" loading="lazy" onerror="this.outerHTML=CardArt.generate('${escapeHtml(card.title).replace(/'/g, "\\'")}','${card.type}')">`
      : CardArt.generate(card.title, card.type);

    return `
      <div class="swiper-slide">
        <div class="card">
          <div class="card-art">${artHtml}</div>
          <div class="card-content">
            <span class="card-tag" data-type="${card.type}">${card.emoji} ${card.label}</span>
            <h2 class="card-title">${escapeHtml(card.title)}</h2>
            <p class="card-body">${escapeHtml(card.body)}</p>
            ${card.source_url ? `<a class="card-source" href="${escapeHtml(card.source_url)}" target="_blank" rel="noopener">${escapeHtml(card.source_name || 'Read more')}</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function buildEndCard(streak) {
    const data = getData();
    const totalSwiped = data.totalSwiped || 0;

    return `
      <div class="swiper-slide">
        <div class="card card-end">
          <div class="end-emoji">🍪</div>
          <div class="end-title">That's your daily dose, honey</div>
          <div class="end-subtitle">You're all caught up. Go make something beautiful.</div>
          ${streak >= 2 ? `<div class="end-streak">🔥 ${streak} day streak!</div>` : ''}
          <div class="end-stats">${totalSwiped} cards swiped total</div>
          ${navigator.share ? `<button class="share-btn" onclick="shareApp()">Share with a friend</button>` : ''}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Update Progress ──
  function updateProgress(index) {
    const total = totalCards + 1; // +1 for end card
    const current = index + 1;
    cardCounter.textContent = `${current} / ${total}`;
    progressBar.style.width = `${(current / total) * 100}%`;

    // Track swipes
    if (index > 0) {
      trackSwipe();
    }
  }

  // ── Load Cards ──
  async function loadCards() {
    let cards = null;

    try {
      const response = await fetch(DATA_URL, { cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        cards = data.cards;
        // Cache for offline
        setData({ cachedCards: data });
      }
    } catch (e) {
      console.log('Network fetch failed, trying cache...', e);
    }

    // Fallback to cached cards
    if (!cards) {
      const data = getData();
      if (data.cachedCards && data.cachedCards.cards) {
        cards = data.cachedCards.cards;
        console.log('Using cached cards');
      }
    }

    // Fallback to demo cards
    if (!cards || cards.length === 0) {
      cards = getDemoCards();
    }

    return cards;
  }

  // ── Demo Cards (for first run / testing) ──
  function getDemoCards() {
    return [
      {
        id: 'holy-shit-demo',
        type: 'holy_shit',
        emoji: '🔥',
        label: 'HOLY SHIT',
        title: 'ChatGPT Now Makes Full Apps From a Single Sentence',
        body: 'OpenAI just shipped something wild, honey. You describe what you want — "a recipe app that tracks my pantry" — and it builds the whole damn thing. Frontend, backend, database. Is it perfect? Hell no. But it\'s a working prototype in 30 seconds that would\'ve taken a developer a week. This isn\'t replacing programmers, it\'s giving everyone else a starting point.',
        source_url: 'https://openai.com',
        source_name: 'OpenAI Blog'
      },
      {
        id: 'quick-bite-1',
        type: 'quick_bite',
        emoji: '⚡',
        label: 'QUICK BITE',
        title: 'Midjourney V7 Actually Understands Hands Now',
        body: 'After three years of giving everyone six fingers, Midjourney finally figured out human anatomy. V7 renders hands, feet, and text with actual accuracy. It only took them roughly a billion images to learn what every kindergartner already knows.',
        source_url: 'https://midjourney.com',
        source_name: 'Midjourney'
      },
      {
        id: 'quick-bite-2',
        type: 'quick_bite',
        emoji: '⚡',
        label: 'QUICK BITE',
        title: 'Google Gave NotebookLM a Voice and It Won\'t Shut Up',
        body: 'Google\'s NotebookLM can now turn any PDF into a podcast-style conversation. Upload your research paper, get two AI hosts chatting about it like it\'s sports commentary. Surprisingly engaging. Your reading list just became your commute playlist.',
        source_url: 'https://notebooklm.google.com',
        source_name: 'Google'
      },
      {
        id: 'tool-drop-demo',
        type: 'tool_drop',
        emoji: '🔧',
        label: 'TOOL DROP',
        title: 'Kling 2.0 — Video Generation That Doesn\'t Look Drunk',
        body: 'Kling\'s new model generates 10-second clips that actually have consistent physics. Objects don\'t melt, people don\'t grow extra limbs, and camera movements look intentional. Try this: upload a product photo and ask for a "cinematic reveal." The results are genuinely usable for social media.',
        source_url: 'https://kling.ai',
        source_name: 'Kling AI'
      },
      {
        id: 'try-this-demo',
        type: 'try_this',
        emoji: '🎯',
        label: 'TRY THIS',
        title: 'The "Explain It to a 5-Year-Old" Prompt Hack',
        body: 'Next time an AI gives you a wall of jargon, add this to your prompt: "Now explain it like I\'m five, then like I\'m a professional, then give me the one sentence that matters." Three levels of understanding in one response. Works on any topic. You\'re welcome, honey.',
        source_url: null,
        source_name: null
      },
      {
        id: 'bs-detector-demo',
        type: 'bs_detector',
        emoji: '💩',
        label: 'BS DETECTOR',
        title: '"AI Will Replace All Jobs by 2027"',
        body: 'Every month someone publishes this headline and every month it\'s the same recycled fear-mongering. AI is changing work, sure. But replacing ALL jobs? Honey, my plumber was here yesterday and I promise you no chatbot is fixing a burst pipe at 2am. The real story is more boring: some tasks get automated, new ones appear, and most of us adapt.',
        source_url: null,
        source_name: null
      },
      {
        id: 'cookie-demo',
        type: 'cookie',
        emoji: '🍪',
        label: 'COOKIE',
        title: 'Grandma\'s Closing Thought',
        body: 'The best AI tool is the one that gives you more time to do the thing you actually love. Everything else is just noise, sweetheart.',
        source_url: null,
        source_name: null
      }
    ];
  }

  // ── Share ──
  window.shareApp = async function () {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI for Grandmas',
          text: 'Your daily AI news in 5 minutes — swipe through top stories explained by a grandma who actually gets it.',
          url: window.location.href
        });
      } catch (e) {
        // User cancelled, that's fine
      }
    }
  };

  // ── PWA Install ──
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install banner after a few swipes
    setTimeout(() => {
      installBanner.classList.add('visible');
    }, 8000);
  });

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('Install prompt result:', result.outcome);
      deferredPrompt = null;
    }
    installBanner.classList.remove('visible');
  });

  installDismiss.addEventListener('click', () => {
    installBanner.classList.remove('visible');
  });

  // ── Init ──
  async function init() {
    try {
      // Update streak
      const streak = updateStreak();
      showStreak(streak);
      checkFirstVisit();

      // Load cards
      const cards = await loadCards();
      totalCards = cards.length;

      // Render cards
      let html = '';
      cards.forEach(card => {
        html += buildCardSlide(card);
      });
      html += buildEndCard(streak);
      cardWrapper.innerHTML = html;

      // Init Swiper
      swiper = new Swiper('#cardSwiper', {
        direction: 'vertical',
        effect: 'creative',
        creativeEffect: {
          prev: {
            translate: [0, '-120%', -100],
            opacity: 0,
          },
          next: {
            translate: [0, '100%', 0],
            opacity: 1,
          },
        },
        speed: 350,
        resistanceRatio: 0.6,
        touchRatio: 1.2,
        on: {
          slideChange: function () {
            updateProgress(this.activeIndex);

            // Hide swipe hint after first swipe
            if (this.activeIndex > 0) {
              swipeHint.classList.add('hidden');
            }
          }
        }
      });

      // Initial progress
      updateProgress(0);
    } catch (err) {
      console.error('Init error:', err);
    }

    // Always hide loading — even if something above fails
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 400);
  }

  // ── Register Service Worker (web only — skip on Capacitor native) ──
  if ('serviceWorker' in navigator && !window.Capacitor) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }

  // Boot
  init();
})();
