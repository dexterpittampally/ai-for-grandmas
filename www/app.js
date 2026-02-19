/**
 * AI for Grandmas — Card Swipe App (v2)
 *
 * Features: card swiping, per-card share, double-tap save/bookmark,
 * dot progress indicators, onboarding, offline detection, streak tracking.
 */

(function () {
  'use strict';

  // ── Config ──
  const DATA_URL = 'data/latest.json';
  const STORAGE_KEY = 'afg_data';

  // ── DOM refs ──
  const loadingScreen = document.getElementById('loadingScreen');
  const cardWrapper = document.getElementById('cardWrapper');
  const dotIndicators = document.getElementById('dotIndicators');
  const streakBadge = document.getElementById('streakBadge');
  const streakCountEl = document.getElementById('streakCount');
  const swipeHint = document.getElementById('swipeHint');
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installDismiss = document.getElementById('installDismiss');
  const heartBurst = document.getElementById('heartBurst');
  const savedBtn = document.getElementById('savedBtn');
  const savedCount = document.getElementById('savedCount');
  const savedOverlay = document.getElementById('savedOverlay');
  const savedClose = document.getElementById('savedClose');
  const savedList = document.getElementById('savedList');
  const offlineBanner = document.getElementById('offlineBanner');

  let swiper = null;
  let totalCards = 0;
  let allCards = []; // Store for bookmark lookups
  let isOffline = false;

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

  // ── Saved/Bookmark helpers ──
  function getSavedCards() {
    const data = getData();
    return data.savedCards || [];
  }

  function saveCard(card) {
    const saved = getSavedCards();
    if (saved.find(c => c.id === card.id)) return false; // Already saved
    saved.push({
      id: card.id,
      type: card.type,
      emoji: card.emoji,
      label: card.label,
      title: card.title,
      body: card.body,
      source_url: card.source_url,
      source_name: card.source_name,
      saved_at: new Date().toISOString()
    });
    setData({ savedCards: saved });
    updateSavedUI();
    return true;
  }

  function updateSavedUI() {
    const saved = getSavedCards();
    if (saved.length > 0) {
      savedBtn.classList.remove('hidden');
      savedCount.textContent = saved.length;
    } else {
      savedBtn.classList.add('hidden');
    }
  }

  function renderSavedCards() {
    const saved = getSavedCards();
    if (saved.length === 0) {
      savedList.innerHTML = '<p class="saved-empty">No saved cards yet. Double-tap any card to save it.</p>';
      return;
    }

    savedList.innerHTML = saved.map(card => `
      <div class="saved-card" style="border-left-color: var(--type-${card.type.replace('_', '-')}, var(--accent))">
        <div class="saved-card-tag">${card.emoji} ${card.label}</div>
        <div class="saved-card-title">${escapeHtml(card.title)}</div>
        <div class="saved-card-body">${escapeHtml(card.body)}</div>
        ${card.source_url ? `<a href="${escapeHtml(card.source_url)}" target="_blank" rel="noopener" style="display:block;margin-top:8px;font-size:12px;color:var(--accent);text-decoration:none;">${escapeHtml(card.source_name || 'Read more')} &rarr;</a>` : ''}
      </div>
    `).join('');
  }

  // ── Streak Logic ──
  function updateStreak() {
    const data = getData();
    const today = new Date().toISOString().slice(0, 10);

    if (data.lastVisit === today) {
      return data.streak || 1;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = 1;

    if (data.lastVisit === yesterday) {
      streak = (data.streak || 1) + 1;
    }

    setData({ lastVisit: today, streak: streak });
    return streak;
  }

  function trackSwipe() {
    const data = getData();
    setData({ totalSwiped: (data.totalSwiped || 0) + 1 });
  }

  function showStreak(streak) {
    if (streak >= 2) {
      streakBadge.classList.remove('hidden');
      streakCountEl.textContent = 'Day ' + streak;
    }
  }

  // ── Visit tracking ──
  function getVisitCount() {
    const data = getData();
    return data.visitCount || 0;
  }

  function incrementVisitCount() {
    const data = getData();
    const count = (data.visitCount || 0) + 1;
    setData({ visitCount: count });
    return count;
  }

  function checkFirstVisit() {
    const data = getData();
    if (data.hasVisited) {
      swipeHint.classList.add('hidden');
    } else {
      setData({ hasVisited: true });
    }
  }

  // ── Welcome Card (first visit only) ──
  function buildWelcomeCard() {
    return `
      <div class="swiper-slide">
        <div class="card card-welcome">
          <div class="card-content" style="display:flex;flex-direction:column;justify-content:center;padding:32px 28px;">
            <div class="welcome-emoji">&#129489;</div>
            <div class="welcome-title">Welcome, honey</div>
            <div class="welcome-body">
              I'm your daily AI news digest. 5-8 cards, ~3 minutes, zero jargon. Swipe up to read, double-tap to save, and share anything worth talking about.
            </div>
            <div class="welcome-types">
              <span class="welcome-type-pill card-tag" data-type="holy_shit">&#128293; BIG NEWS</span>
              <span class="welcome-type-pill card-tag" data-type="quick_bite">&#9889; QUICK BITE</span>
              <span class="welcome-type-pill card-tag" data-type="tool_drop">&#128295; TOOL DROP</span>
              <span class="welcome-type-pill card-tag" data-type="try_this">&#127919; TRY THIS</span>
              <span class="welcome-type-pill card-tag" data-type="bs_detector">&#128169; BS DETECTOR</span>
              <span class="welcome-type-pill card-tag" data-type="cookie">&#127850; COOKIE</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Build Card HTML ──
  function buildCardSlide(card, index) {
    // Use AI-generated image if available, fall back to generative SVG
    const artHtml = card.image_url
      ? '<img src="' + escapeHtml(card.image_url) + '" alt="" class="card-art-image" loading="lazy" onerror="this.parentElement.innerHTML=CardArt.generate(\'\',\'' + card.type + '\')">'
      : CardArt.generate(card.title || '', card.type || 'quick_bite');

    const sourceHtml = card.source_url
      ? '<a class="card-source" href="' + escapeHtml(card.source_url) + '" target="_blank" rel="noopener">' + escapeHtml(card.source_name || 'Read more') + '</a>'
      : '<span></span>';

    const shareBtn = '<button class="card-share-btn" onclick="window.shareCard(' + index + ')" aria-label="Share this card">&#9998;</button>';

    return '<div class="swiper-slide">' +
      '<div class="card" data-type="' + card.type + '" data-index="' + index + '">' +
        '<div class="card-art">' + artHtml + '</div>' +
        '<div class="card-content">' +
          '<span class="card-tag" data-type="' + card.type + '">' + card.emoji + ' ' + card.label + '</span>' +
          '<h2 class="card-title">' + escapeHtml(card.title) + '</h2>' +
          '<p class="card-body">' + escapeHtml(card.body) + '</p>' +
          '<div class="card-actions">' + sourceHtml + shareBtn + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function buildEndCard(streak) {
    const data = getData();
    const totalSwiped = data.totalSwiped || 0;

    return '<div class="swiper-slide">' +
      '<div class="card card-end">' +
        '<div class="end-emoji">&#127850;</div>' +
        '<div class="end-title">That\'s your daily dose, honey</div>' +
        '<div class="end-subtitle">You\'re all caught up. Go make something beautiful.</div>' +
        (streak >= 2 ? '<div class="end-streak">&#128293; ' + streak + ' day streak!</div>' : '') +
        '<div class="end-stats">' + totalSwiped + ' cards swiped total</div>' +
        (navigator.share ? '<button class="share-btn" onclick="shareApp()">Share with a friend</button>' : '') +
      '</div>' +
    '</div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Dot Indicators ──
  function buildDots(cards, showWelcome) {
    let html = '';
    if (showWelcome) {
      html += '<div class="dot type-welcome" data-index="0"></div>';
    }
    const offset = showWelcome ? 1 : 0;
    cards.forEach(function (card, i) {
      html += '<div class="dot type-' + card.type + '" data-index="' + (i + offset) + '"></div>';
    });
    html += '<div class="dot type-end" data-index="' + (cards.length + offset) + '"></div>';
    dotIndicators.innerHTML = html;
  }

  function updateDots(index) {
    var dots = dotIndicators.querySelectorAll('.dot');
    dots.forEach(function (dot, i) {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Track swipes
    if (index > 0) {
      trackSwipe();
    }
  }

  // ── Double-tap to save ──
  let lastTap = 0;
  function handleDoubleTap(e) {
    const now = Date.now();
    const card = e.target.closest('.card[data-index]');
    if (!card) return;

    if (now - lastTap < 300) {
      // Double tap detected
      const index = parseInt(card.dataset.index);
      if (index >= 0 && index < allCards.length) {
        const saved = saveCard(allCards[index]);
        if (saved) {
          // Show heart animation
          heartBurst.classList.remove('hidden', 'animate');
          // Force reflow
          void heartBurst.offsetWidth;
          heartBurst.classList.add('animate');
          setTimeout(function () {
            heartBurst.classList.remove('animate');
            heartBurst.classList.add('hidden');
          }, 700);
        }
      }
    }
    lastTap = now;
  }

  // ── Share individual card ──
  window.shareCard = async function (index) {
    if (index < 0 || index >= allCards.length) return;
    var card = allCards[index];
    var text = card.emoji + ' ' + card.title + '\n\n' + card.body;
    if (card.source_url) {
      text += '\n\n' + card.source_url;
    }
    text += '\n\n— AI for Grandmas';

    if (navigator.share) {
      try {
        await navigator.share({
          title: card.title,
          text: text,
          url: card.source_url || window.location.href
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        // Brief visual feedback
        var btn = document.querySelector('.card[data-index="' + index + '"] .card-share-btn');
        if (btn) {
          btn.textContent = '\u2713';
          setTimeout(function () { btn.innerHTML = '&#9998;'; }, 1500);
        }
      } catch (e) {
        // Clipboard not available
      }
    }
  };

  // ── Share App ──
  window.shareApp = async function () {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI for Grandmas',
          text: 'Your daily AI news in 5 minutes \u2014 explained by a grandma who actually gets it.',
          url: window.location.href
        });
      } catch (e) {
        // User cancelled
      }
    }
  };

  // ── Load Cards ──
  async function loadCards() {
    var cards = null;
    isOffline = false;

    try {
      var response = await fetch(DATA_URL, { cache: 'no-cache' });
      if (response.ok) {
        var data = await response.json();
        cards = data.cards;
        setData({ cachedCards: data });
      }
    } catch (e) {
      console.log('Network fetch failed, trying cache...', e);
      isOffline = true;
    }

    // Fallback to cached cards
    if (!cards) {
      var stored = getData();
      if (stored.cachedCards && stored.cachedCards.cards) {
        cards = stored.cachedCards.cards;
        isOffline = true;
        console.log('Using cached cards');
      }
    }

    // Fallback to demo cards
    if (!cards || cards.length === 0) {
      cards = getDemoCards();
    }

    // Show offline banner if using cached data
    if (isOffline && offlineBanner) {
      offlineBanner.classList.remove('hidden');
    }

    return cards;
  }

  // ── Demo Cards ──
  function getDemoCards() {
    return [
      { id: 'holy-shit-demo', type: 'holy_shit', emoji: '\uD83D\uDD25', label: 'HOLY SHIT', title: 'ChatGPT Now Makes Full Apps From a Single Sentence', body: 'OpenAI just shipped something wild, honey. You describe what you want and it builds the whole thing. Frontend, backend, database.\n\nIs it perfect? Hell no. But it\'s a working prototype in 30 seconds that would\'ve taken a developer a week.', source_url: 'https://openai.com', source_name: 'OpenAI Blog' },
      { id: 'quick-bite-1', type: 'quick_bite', emoji: '\u26A1', label: 'QUICK BITE', title: 'Midjourney V7 Actually Understands Hands Now', body: 'After three years of giving everyone six fingers, Midjourney finally figured out human anatomy.\n\nV7 renders hands, feet, and text with actual accuracy. It only took them roughly a billion images to learn what every kindergartner already knows.', source_url: 'https://midjourney.com', source_name: 'Midjourney' },
      { id: 'tool-drop-demo', type: 'tool_drop', emoji: '\uD83D\uDD27', label: 'TOOL DROP', title: 'Kling 2.0 \u2014 Video Generation That Doesn\'t Look Drunk', body: 'Kling\'s new model generates 10-second clips with consistent physics. Objects don\'t melt, people don\'t grow extra limbs.\n\nTry this: upload a product photo and ask for a "cinematic reveal." The results are genuinely usable for social media.', source_url: 'https://kling.ai', source_name: 'Kling AI' },
      { id: 'try-this-demo', type: 'try_this', emoji: '\uD83C\uDFAF', label: 'TRY THIS', title: 'The "Explain It to a 5-Year-Old" Prompt Hack', body: 'Next time an AI gives you a wall of jargon, add this:\n\n"Now explain it like I\'m five, then like I\'m a professional, then give me the one sentence that matters."\n\nThree levels of understanding in one response. You\'re welcome, honey.', source_url: null, source_name: null },
      { id: 'cookie-demo', type: 'cookie', emoji: '\uD83C\uDF6A', label: 'COOKIE', title: 'Grandma\'s Closing Thought', body: 'The best AI tool is the one that gives you more time to do the thing you actually love. Everything else is just noise, sweetheart.', source_url: null, source_name: null }
    ];
  }

  // ── PWA Install ──
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;

    // Only show install banner on 2nd+ visit
    var visits = getVisitCount();
    if (visits >= 2) {
      setTimeout(function () {
        installBanner.classList.add('visible');
      }, 8000);
    }
  });

  installBtn.addEventListener('click', async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    installBanner.classList.remove('visible');
  });

  installDismiss.addEventListener('click', function () {
    installBanner.classList.remove('visible');
  });

  // ── Saved cards UI ──
  savedBtn.addEventListener('click', function () {
    renderSavedCards();
    savedOverlay.classList.remove('hidden');
  });

  savedClose.addEventListener('click', function () {
    savedOverlay.classList.add('hidden');
  });

  // ── Init ──
  async function init() {
    try {
      // Track visits
      var visits = incrementVisitCount();
      var isFirstVisit = visits <= 1;

      // Update streak
      var streak = updateStreak();
      showStreak(streak);
      checkFirstVisit();
      updateSavedUI();

      // Load cards
      var cards = await loadCards();
      allCards = cards;
      totalCards = cards.length;

      // Render cards
      var html = '';

      // Welcome card on first visit
      if (isFirstVisit) {
        html += buildWelcomeCard();
      }

      cards.forEach(function (card, i) {
        html += buildCardSlide(card, i);
      });
      html += buildEndCard(streak);
      cardWrapper.innerHTML = html;

      // Build dot indicators
      buildDots(cards, isFirstVisit);

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
            updateDots(this.activeIndex);

            // Hide swipe hint after first swipe
            if (this.activeIndex > 0) {
              swipeHint.classList.add('hidden');
            }
          }
        }
      });

      // Initial dot state
      updateDots(0);

      // Double-tap listener on the swiper container
      document.getElementById('cardSwiper').addEventListener('click', handleDoubleTap);

    } catch (err) {
      console.error('Init error:', err);
    }

    // Always hide loading
    setTimeout(function () {
      loadingScreen.classList.add('hidden');
    }, 400);
  }

  // ── Register Service Worker (web only) ──
  if ('serviceWorker' in navigator && !window.Capacitor) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js')
        .then(function (reg) { console.log('SW registered:', reg.scope); })
        .catch(function (err) { console.log('SW registration failed:', err); });
    });
  }

  // Boot
  init();
})();
