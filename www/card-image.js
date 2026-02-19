/**
 * AI for Grandmas — Shareable Card Image Generator
 *
 * Uses Canvas API to generate branded 1080x1920 images (Instagram Story size)
 * for sharing cards as images on social media.
 */

const CardImage = (() => {
  'use strict';

  const W = 1080;
  const H = 1920;
  const PAD = 80;
  const CONTENT_W = W - PAD * 2;

  // Type color map
  const TYPE_COLORS = {
    holy_shit:   { bg: '#1c1017', accent: '#dc2626', tagBg: '#fee2e2', tagText: '#b91c1c' },
    quick_bite:  { bg: '#1a1708', accent: '#d97706', tagBg: '#fef3c7', tagText: '#92400e' },
    tool_drop:   { bg: '#0a1a10', accent: '#16a34a', tagBg: '#dcfce7', tagText: '#15803d' },
    try_this:    { bg: '#0c1220', accent: '#2563eb', tagBg: '#dbeafe', tagText: '#1d4ed8' },
    bs_detector: { bg: '#150c1e', accent: '#9333ea', tagBg: '#f3e8ff', tagText: '#7e22ce' },
    cookie:      { bg: '#1a120a', accent: '#e8734a', tagBg: '#fef0e4', tagText: '#e8734a' },
  };

  // Word-wrap text for canvas
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Round rect helper
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Generate a shareable card image as a data URL.
   * @param {Object} card - Card data object
   * @returns {Promise<string>} data URL of the generated image
   */
  async function generate(card) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const type = card.type || 'quick_bite';
    const colors = TYPE_COLORS[type] || TYPE_COLORS.quick_bite;

    // ── Background ──
    // Dark gradient bg
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, colors.bg);
    bgGrad.addColorStop(0.6, '#0f0f0f');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle accent glow at top
    const glowGrad = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 500);
    glowGrad.addColorStop(0, colors.accent + '30');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, 600);

    let y = 140;

    // ── Brand header ──
    ctx.font = '500 36px Inter, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('🧓  AI for Grandmas', PAD, y);
    y += 100;

    // ── Card container (rounded rect) ──
    const cardTop = y;
    const cardPad = 60;

    // We'll calculate card height after rendering content, so draw card bg later
    let contentY = cardTop + cardPad;

    // ── Tag pill ──
    const tagText = (card.emoji || '') + '  ' + (card.label || type.replace('_', ' ').toUpperCase());
    ctx.font = 'bold 28px Inter, -apple-system, sans-serif';
    const tagMetrics = ctx.measureText(tagText);
    const tagW = tagMetrics.width + 40;
    const tagH = 52;

    // Save tag position, draw after card bg
    const tagX = PAD + cardPad;
    const tagY = contentY;
    contentY += tagH + 36;

    // ── Title ──
    ctx.font = 'bold 56px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleLines = wrapText(ctx, card.title || '', CONTENT_W - cardPad * 2);
    const titleY = contentY;
    const titleLineHeight = 72;
    contentY += titleLines.length * titleLineHeight + 40;

    // ── Body ──
    ctx.font = '400 38px Georgia, serif';
    const bodyText = (card.body || '').replace(/\n+/g, '\n');
    const bodyParagraphs = bodyText.split('\n');
    const bodyLines = [];
    bodyParagraphs.forEach((para, pi) => {
      if (pi > 0 && para.trim()) bodyLines.push(''); // blank line between paragraphs
      const wrapped = wrapText(ctx, para.trim(), CONTENT_W - cardPad * 2);
      wrapped.forEach(line => bodyLines.push(line));
    });
    const bodyY = contentY;
    const bodyLineHeight = 58;

    // Limit body lines to fit
    const maxBodyLines = 16;
    const visibleBodyLines = bodyLines.slice(0, maxBodyLines);
    contentY += visibleBodyLines.length * bodyLineHeight + 50;

    // ── Source line ──
    const sourceText = card.source_name ? '— ' + card.source_name : '';
    const sourceY = contentY;
    if (sourceText) contentY += 50;

    contentY += cardPad;

    // ── Now draw the card background ──
    const cardHeight = contentY - cardTop;
    ctx.save();
    roundRect(ctx, PAD, cardTop, W - PAD * 2, cardHeight, 32);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    // Subtle border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // ── Accent bar at top of card ──
    ctx.save();
    roundRect(ctx, PAD, cardTop, W - PAD * 2, 6, 3);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.restore();

    // ── Draw tag pill ──
    ctx.save();
    roundRect(ctx, tagX, tagY, tagW, tagH, 12);
    ctx.fillStyle = colors.tagBg;
    ctx.fill();
    ctx.font = 'bold 28px Inter, -apple-system, sans-serif';
    ctx.fillStyle = colors.tagText;
    ctx.fillText(tagText, tagX + 20, tagY + 36);
    ctx.restore();

    // ── Draw title ──
    ctx.font = 'bold 56px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    titleLines.forEach((line, i) => {
      ctx.fillText(line, PAD + cardPad, titleY + (i + 1) * titleLineHeight);
    });

    // ── Draw body ──
    ctx.font = '400 38px Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    visibleBodyLines.forEach((line, i) => {
      if (line === '') return; // blank paragraph gap
      ctx.fillText(line, PAD + cardPad, bodyY + (i + 1) * bodyLineHeight);
    });

    // ── Draw source ──
    if (sourceText) {
      ctx.font = '500 30px Inter, -apple-system, sans-serif';
      ctx.fillStyle = colors.accent;
      ctx.fillText(sourceText, PAD + cardPad, sourceY + 36);
    }

    // ── Footer branding ──
    const footerY = H - 120;
    ctx.font = '400 30px Inter, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('swipe daily  ·  aigrandmas.com', W / 2, footerY);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  }

  /**
   * Generate and trigger share/download of a card image.
   * @param {Object} card - Card data object
   */
  async function shareCardImage(card) {
    const dataUrl = await generate(card);

    // Convert data URL to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'ai-for-grandmas-card.png', { type: 'image/png' });

    // Try native share with file
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: card.title,
          text: card.emoji + ' ' + card.title + ' — AI for Grandmas',
          files: [file]
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // User cancelled
      }
    }

    // Fallback: download the image
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'ai-for-grandmas-' + (card.type || 'card') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { generate, shareCardImage };
})();
