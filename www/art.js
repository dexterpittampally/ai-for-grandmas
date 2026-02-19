/**
 * AI for Grandmas — Generative SVG Card Art Engine
 *
 * Creates unique abstract illustrations per card from title hash.
 * Zero API calls, works offline, consistent visual brand.
 */

const CardArt = (() => {
  // Warm palette families — each card gets one based on hash
  const PALETTES = [
    ['#e8734a', '#f4a261', '#fef0e4', '#264653', '#2a9d8f'], // terracotta sunset
    ['#6b705c', '#a5a58d', '#ffe8d6', '#cb997e', '#ddbea9'], // sage earth
    ['#bc6c25', '#dda15e', '#fefae0', '#606c38', '#283618'], // harvest gold
    ['#e07a5f', '#f2cc8f', '#f4f1de', '#3d405b', '#81b29a'], // tuscan warmth
    ['#d4a373', '#faedcd', '#fefae0', '#e9edc9', '#ccd5ae'], // cream meadow
    ['#b5838d', '#e5989b', '#ffb4a2', '#ffcdb2', '#6d6875'], // dusty rose
    ['#7f5539', '#b08968', '#ddb892', '#e6ccb2', '#ede0d4'], // warm walnut
    ['#588157', '#a3b18a', '#dad7cd', '#344e41', '#3a5a40'], // forest moss
  ];

  // Hash a string to a number
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  // Seeded pseudo-random number generator
  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // Pick palette from hash
  function getPalette(h) {
    return PALETTES[h % PALETTES.length];
  }

  // Pattern 1: Gradient blobs with soft circles
  function blobPattern(rand, palette, w, h) {
    let shapes = '';
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 40 + rand() * 80;
      const color = palette[Math.floor(rand() * palette.length)];
      const opacity = 0.3 + rand() * 0.4;
      shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`;
    }
    return shapes;
  }

  // Pattern 2: Geometric shapes — rotated rectangles and triangles
  function geoPattern(rand, palette, w, h) {
    let shapes = '';
    const count = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const size = 30 + rand() * 60;
      const color = palette[Math.floor(rand() * palette.length)];
      const opacity = 0.25 + rand() * 0.4;
      const rotation = rand() * 360;

      if (rand() > 0.5) {
        // Rectangle
        shapes += `<rect x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${rotation.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" rx="${(rand() * 8).toFixed(1)}"/>`;
      } else {
        // Triangle
        const x1 = x, y1 = y - size / 2;
        const x2 = x - size / 2, y2 = y + size / 2;
        const x3 = x + size / 2, y3 = y + size / 2;
        shapes += `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${rotation.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }
    }
    return shapes;
  }

  // Pattern 3: Wave lines
  function wavePattern(rand, palette, w, h) {
    let shapes = '';
    const lineCount = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < lineCount; i++) {
      const y = (h / (lineCount + 1)) * (i + 1);
      const amplitude = 15 + rand() * 30;
      const frequency = 1 + rand() * 2;
      const color = palette[Math.floor(rand() * palette.length)];
      const strokeWidth = 2 + rand() * 4;

      let d = `M 0 ${y.toFixed(1)}`;
      for (let x = 0; x <= w; x += 10) {
        const offset = Math.sin((x / w) * Math.PI * frequency * 2 + rand() * 6) * amplitude;
        d += ` L ${x} ${(y + offset).toFixed(1)}`;
      }
      shapes += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" opacity="${(0.3 + rand() * 0.4).toFixed(2)}" stroke-linecap="round"/>`;
    }
    return shapes;
  }

  // Pattern 4: Dot grid
  function dotGridPattern(rand, palette, w, h) {
    let shapes = '';
    const spacing = 25 + Math.floor(rand() * 15);
    const jitter = 5 + rand() * 10;

    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        const jx = x + (rand() - 0.5) * jitter;
        const jy = y + (rand() - 0.5) * jitter;
        const r = 2 + rand() * 6;
        const color = palette[Math.floor(rand() * palette.length)];
        const opacity = 0.2 + rand() * 0.5;
        shapes += `<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`;
      }
    }
    return shapes;
  }

  // Pattern 5: Abstract arcs
  function arcPattern(rand, palette, w, h) {
    let shapes = '';
    const count = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 30 + rand() * 70;
      const startAngle = rand() * 360;
      const sweep = 60 + rand() * 180;
      const color = palette[Math.floor(rand() * palette.length)];
      const strokeWidth = 3 + rand() * 6;

      const endAngle = startAngle + sweep;
      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
      const largeArc = sweep > 180 ? 1 : 0;

      shapes += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" opacity="${(0.3 + rand() * 0.4).toFixed(2)}" stroke-linecap="round"/>`;
    }
    return shapes;
  }

  // Pattern 6: Layered circles (concentric, offset)
  function layeredCirclePattern(rand, palette, w, h) {
    let shapes = '';
    const groups = 2 + Math.floor(rand() * 2);

    for (let g = 0; g < groups; g++) {
      const cx = w * 0.2 + rand() * w * 0.6;
      const cy = h * 0.2 + rand() * h * 0.6;
      const rings = 3 + Math.floor(rand() * 3);
      const maxR = 40 + rand() * 50;

      for (let i = rings; i >= 0; i--) {
        const r = maxR * ((i + 1) / (rings + 1));
        const color = palette[Math.floor(rand() * palette.length)];
        const opacity = 0.15 + rand() * 0.3;
        const offsetX = (rand() - 0.5) * 10;
        const offsetY = (rand() - 0.5) * 10;
        shapes += `<circle cx="${(cx + offsetX).toFixed(1)}" cy="${(cy + offsetY).toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`;
      }
    }
    return shapes;
  }

  const PATTERNS = [blobPattern, geoPattern, wavePattern, dotGridPattern, arcPattern, layeredCirclePattern];

  /**
   * Generate an SVG illustration for a card.
   * @param {string} title - Card title (used as seed)
   * @param {string} type - Card type (holy_shit, quick_bite, etc.)
   * @returns {string} SVG markup
   */
  function generate(title, type = '') {
    const seed = hash(title + type);
    const rand = seededRandom(seed);
    const palette = getPalette(seed);
    const w = 400;
    const h = 200;

    // Pick 1-2 patterns and layer them
    const patternIdx1 = seed % PATTERNS.length;
    const patternIdx2 = (seed + 3) % PATTERNS.length;
    const useTwo = rand() > 0.4;

    // Soft background gradient
    const bg1 = palette[2] || palette[0];
    const bg2 = palette[3] || palette[1];
    const gradAngle = Math.floor(rand() * 360);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">`;
    svg += `<defs><linearGradient id="bg-${seed}" gradientTransform="rotate(${gradAngle})">`;
    svg += `<stop offset="0%" stop-color="${bg1}"/>`;
    svg += `<stop offset="100%" stop-color="${bg2}"/>`;
    svg += `</linearGradient></defs>`;
    svg += `<rect width="${w}" height="${h}" fill="url(#bg-${seed})"/>`;

    // Layer patterns
    svg += PATTERNS[patternIdx1](rand, palette, w, h);
    if (useTwo) {
      svg += PATTERNS[patternIdx2](rand, palette, w, h);
    }

    svg += '</svg>';
    return svg;
  }

  return { generate, hash };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardArt;
}
