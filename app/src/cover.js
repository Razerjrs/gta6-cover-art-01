// Neon Coast cover engine: multi-panel layouts, sunset/neon gradient-map grades,
// bold Anton title lettering with a Pacifico neon subtitle, grain and vignette.
// Everything is drawn on a 2D canvas — no network, no Rockstar art, fonts or logos.

export const LAYOUTS = ['grid', 'hero', 'full', 'nine'];

/** Colour grades: a warm wash, a cool wash and the duotone overlay used per panel. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.25) contrast(1.08) brightness(1.02)',
    wash: ['rgba(255,122,61,0.20)', 'rgba(232,62,140,0.28)'],
    title: ['#ffd166', '#ff7a3d'],
    accent: '#ff2e96',
  },
  neon: {
    label: 'Neon night',
    filter: 'saturate(1.35) contrast(1.12) brightness(0.98)',
    wash: ['rgba(255,46,150,0.26)', 'rgba(34,230,230,0.22)'],
    title: ['#22e6e6', '#ff2e96'],
    accent: '#22e6e6',
  },
  vice: {
    label: 'Vice dusk',
    filter: 'saturate(1.3) contrast(1.1)',
    wash: ['rgba(255,154,90,0.22)', 'rgba(123,47,247,0.30)'],
    title: ['#ff9a5a', '#c77dff'],
    accent: '#ff9a5a',
  },
  teal: {
    label: 'Teal night',
    filter: 'saturate(1.2) contrast(1.12) brightness(0.95)',
    wash: ['rgba(25,194,184,0.24)', 'rgba(11,61,145,0.34)'],
    title: ['#7ef0e6', '#4d8dff'],
    accent: '#19c2b8',
  },
  gold: {
    label: 'Golden hour',
    filter: 'saturate(1.3) contrast(1.06) brightness(1.05)',
    wash: ['rgba(255,209,102,0.24)', 'rgba(193,68,14,0.26)'],
    title: ['#fff3c4', '#ff9a3d'],
    accent: '#ffd166',
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Panel rectangles for a layout, in cover coordinates. Title band is separate. */
export function layoutPanels(layout, w, h) {
  const band = layout === 'full' ? 0 : Math.round(h * 0.21);
  const top = h - band;
  const g = Math.max(6, Math.round(w * 0.012)); // white gutter
  const panels = [];
  if (layout === 'grid') {
    const cw = (w - g * 3) / 2;
    const ch = (top - g * 3) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch });
      }
    }
  } else if (layout === 'hero') {
    const heroW = Math.round(w * 0.58);
    const sideW = w - heroW - g * 3;
    const sh = (top - g * 4) / 3;
    panels.push({ x: g, y: g, w: heroW, h: top - g * 2 });
    for (let i = 0; i < 3; i++) {
      panels.push({ x: heroW + g * 2, y: g + i * (sh + g), w: sideW, h: sh });
    }
  } else if (layout === 'full') {
    panels.push({ x: 0, y: 0, w, h });
  } else {
    // nine: 3x3 panels, each a different crop of the photos
    const cw = (w - g * 4) / 3;
    const ch = (top - g * 4) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch });
      }
    }
  }
  return { panels, band, gutter: g };
}

/** Draw one photo into a panel rect, cover-fit, with per-panel zoom and pan offsets.
 * The pan is clamped to the photo's overscan, so the photo always covers the panel
 * and the panel background never shows through at the edges. */
export function drawPhotoCover(ctx, photo, rect, panel) {
  if (!photo || !photo.naturalWidth) return false;
  const zoom = (panel.zoom ?? 100) / 100;
  const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  // Pan only within the slack the zoom creates; at zoom 100 there is no slack.
  const maxOx = Math.max(0, (pw - rect.w) / 2);
  const maxOy = Math.max(0, (ph - rect.h) / 2);
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));
  const ox = clamp((panel.ox ?? 0) * rect.w * 0.5, maxOx);
  const oy = clamp((panel.oy ?? 0) * rect.h * 0.5, maxOy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, rect.x + (rect.w - pw) / 2 + ox, rect.y + (rect.h - ph) / 2 + oy, pw, ph);
  ctx.restore();
  return true;
}

/** A panel's sunset/neon wash, inked frame and inner white keyline. */
export function gradePanel(ctx, rect, grade, selected) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // warm sun glow in one corner
  const glow = ctx.createRadialGradient(
    rect.x + rect.w * 0.82, rect.y + rect.h * 0.12, 0,
    rect.x + rect.w * 0.82, rect.y + rect.h * 0.12, rect.w * 0.9,
  );
  glow.addColorStop(0, 'rgba(255,190,90,0.20)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // inked frame + white keyline, poster style
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.strokeStyle = '#12081f';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = Math.max(1.5, rect.w * 0.005);
  ctx.strokeStyle = selected ? '#ffd166' : 'rgba(255,255,255,0.85)';
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
}

/** The big Anton title with a sunset gradient fill, hard shadow and neon subtitle. */
export function drawTitleBlock(ctx, state, grade, x, y, w, h) {
  const title = (state.title || 'NEON COAST').toUpperCase();
  const sub = state.subtitle || '';
  const band = { x, y, w, h };
  // band background: deep plum with a diagonal sunset stripe
  ctx.fillStyle = '#160a26';
  ctx.fillRect(x, y, w, h);
  const stripe = ctx.createLinearGradient(x, y, x + w, y + h);
  stripe.addColorStop(0, 'rgba(255,122,61,0.55)');
  stripe.addColorStop(0.5, 'rgba(255,46,150,0.45)');
  stripe.addColorStop(1, 'rgba(123,47,247,0.5)');
  ctx.fillStyle = stripe;
  ctx.fillRect(x, y, w, Math.max(6, h * 0.07));
  ctx.fillRect(x, y + h - Math.max(6, h * 0.07), w, Math.max(6, h * 0.07));

  const sizeScale = (state.titleSize ?? 100) / 100;
  let size = h * 0.52 * sizeScale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const setFont = (s) => { ctx.font = `${s}px Anton, "Arial Black", sans-serif`; };
  setFont(size);
  while (ctx.measureText(title).width > w * 0.94 && size > 20) {
    size -= 4;
    setFont(size);
  }
  const cx = x + w / 2;
  const ty = y + h * (sub ? 0.38 : 0.52);
  // hard offset shadow + gradient fill
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(title, cx + size * 0.06, ty + size * 0.06);
  const grad = ctx.createLinearGradient(x, ty - size / 2, x, ty + size / 2);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(1, grade.title[1]);
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, ty);
  ctx.lineWidth = Math.max(2, size * 0.03);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(title, cx, ty);
  if (sub) {
    const subSize = Math.max(16, h * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(sub, cx, y + h * 0.78);
    ctx.shadowBlur = 0;
  }
  return band;
}

/** Film grain: sparse light/dark speckles over the whole cover. */
export function addGrain(ctx, w, h, amount = 0.05) {
  const n = Math.floor((w * h) / 2600);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${amount})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Vignette: darkened corners so the centre pops. */
export function addVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,20,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw the whole cover onto ctx at size w x h.
 * state: { layout, grade, title, subtitle, titleSize, grain, vignette, panels: [{photo, zoom, ox, oy}] }
 * photos: array of HTMLImageElement (index = panel.photo)
 * selected: index of the selected panel, or -1 (only used for the editor preview keyline)
 */
export function drawCover(ctx, state, photos, w, h, selected = -1) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, band } = layoutPanels(state.layout, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f5efff';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.filter = grade.filter;
  panels.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: -1, zoom: 100, ox: 0, oy: 0 };
    const photo = panel.photo >= 0 ? photos[panel.photo] : null;
    const drawn = drawPhotoCover(ctx, photo, rect, panel);
    if (!drawn) {
      // empty panel: plum placeholder with a sun so the layout still reads
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      ph.addColorStop(0, '#3a1c5e');
      ph.addColorStop(1, '#160a26');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = '#ff7a3d';
      ctx.beginPath();
      ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.42, rect.w * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.max(14, rect.w * 0.05)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.72);
    }
  });
  ctx.restore();
  panels.forEach((rect, i) => gradePanel(ctx, rect, grade, i === selected));
  if (state.layout === 'full') {
    // scrim behind the overlaid title on the full-bleed photo
    const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
    scrim.addColorStop(0, 'rgba(10,4,20,0)');
    scrim.addColorStop(1, 'rgba(10,4,20,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
    drawTitleBlock(ctx, state, grade, 0, h - band - Math.round(h * 0.24), w, Math.round(h * 0.24));
  } else if (band > 0) {
    drawTitleBlock(ctx, state, grade, 0, h - band, w, band);
  }
  if (state.vignette) addVignette(ctx, w, h);
  if (state.grain) addGrain(ctx, w, h);
}

/** Render the cover to a fresh canvas at the named export size and return it. */
export function renderCoverCanvas(state, photos, sizeName) {
  const [w, h] = SIZES[sizeName] || SIZES['1080x1350'];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), state, photos, w, h, -1);
  return canvas;
}
