// Neon Coast Cover Studio — editor wiring: photo tray, panel selection and drag,
// layout / grade / caption controls, PNG export, and ?shot= staging for screenshots.
import { GRADES, LAYOUTS, SIZES, drawCover, layoutPanels, renderCoverCanvas } from './cover.js';

const SAMPLES = [
  { name: 'Boulevard', src: './samples/boulevard.jpg' },
  { name: 'Rooftop', src: './samples/rooftop.jpg' },
  { name: 'Neon street', src: './samples/neon.jpg' },
  { name: 'Pier', src: './samples/pier.jpg' },
];

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

/** The cover state: one entry per panel slot (the largest layout, nine, has 9). */
const state = {
  layout: 'grid',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'Vice nights, your story',
  titleSize: 100,
  grain: true,
  vignette: true,
  panels: Array.from({ length: 9 }, (_, i) => ({ photo: i < 4 ? i : -1, zoom: 100, ox: 0, oy: 0 })),
};

const photos = []; // HTMLImageElement per tray slot, in tray order
let selectedPanel = 0;
let pickedPhoto = 0;
let exportSize = '1080x1350';
let dragging = null;

function panelCount() {
  return state.layout === 'grid' ? 4 : state.layout === 'hero' ? 4 : state.layout === 'full' ? 1 : 9;
}

/** Redraw the live preview canvas at its current size. */
function renderPreview() {
  const [w, h] = SIZES[state.layout === 'full' ? '1080x1350' : '1080x1350'];
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  drawCover(pctx, state, photos, w, h, selectedPanel);
  syncPanelControls();
}

/** Keep the zoom slider and hint in step with the selected panel. */
function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('zoomInput').value = String(panel.zoom);
  $('panelHint').textContent =
    `Panel ${selectedPanel + 1} of ${panelCount()} selected — ` +
    `photo ${panel.photo >= 0 ? photos[panel.photo]?.dataset?.name || `#${panel.photo + 1}` : 'none'}. ` +
    'Drag to move the photo, scroll to zoom.';
}

/** Load an image file (URL or blob) into the tray at the next slot. */
function addPhoto(src, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.dataset.name = name;
    img.onload = () => {
      photos.push(img);
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = name;
      thumb.title = name;
      thumb.addEventListener('click', () => {
        pickedPhoto = photos.length - 1;
        state.panels[selectedPanel].photo = pickedPhoto;
        document.querySelectorAll('#photoTray img').forEach((t) => t.classList.remove('picked'));
        thumb.classList.add('picked');
        renderPreview();
      });
      $('photoTray').appendChild(thumb);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Load the bundled sample photos, then fill the panels with them. */
async function loadSamples() {
  for (const s of SAMPLES) await addPhoto(s.src, s.name);
  // spread the samples across the panels, repeating with different crops;
  // zoom above 100 gives every panel pan slack, so no crop ever shows the edge.
  // Per-photo crop bias keeps faces in frame: boulevard and pier photos are
  // head-high, neon reads best from its signs, rooftop from its skyline.
  const CROP = [
    { ox: 0, oy: 1.3 },
    { ox: 0, oy: -0.1 },
    { ox: 0, oy: 0.55 },
    { ox: 0, oy: 1.0 },
  ];
  state.panels.forEach((p, i) => {
    p.photo = i % photos.length;
    p.zoom = 112 + (i % 3) * 10;
    const bias = CROP[p.photo];
    p.ox = bias.ox + ((i * 13) % 10 - 5) / 100;
    p.oy = bias.oy + ((i * 17) % 10 - 5) / 100;
  });
  pickedPhoto = 0;
  const first = document.querySelector('#photoTray img');
  if (first) first.classList.add('picked');
}

/** Which panel (if any) sits under a point on the preview canvas, in cover coords. */
function panelAt(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * preview.width;
  const y = ((clientY - rect.top) / rect.height) * preview.height;
  const { panels } = layoutPanels(state.layout, preview.width, preview.height);
  const idx = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  return idx >= 0 ? { idx, x, y } : null;
}

function bindPreview() {
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    selectedPanel = hit.idx;
    const panel = state.panels[selectedPanel];
    dragging = { startX: e.clientX, startY: e.clientY, ox: panel.ox, oy: panel.oy, moved: false };
    preview.setPointerCapture(e.pointerId);
    renderPreview();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const { panels } = layoutPanels(state.layout, preview.width, preview.height);
    const p = panels[selectedPanel];
    const dx = ((e.clientX - dragging.startX) / rect.width) * preview.width;
    const dy = ((e.clientY - dragging.startY) / rect.height) * preview.height;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;
    const panel = state.panels[selectedPanel];
    panel.ox = Math.max(-1, Math.min(1, dragging.ox + (dx / p.w) * 2));
    panel.oy = Math.max(-1, Math.min(1, dragging.oy + (dy / p.h) * 2));
    renderPreview();
  });
  preview.addEventListener('pointerup', () => { dragging = null; });
  preview.addEventListener('wheel', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    selectedPanel = hit.idx;
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(100, Math.min(300, panel.zoom - Math.sign(e.deltaY) * 12));
    renderPreview();
  }, { passive: false });
}

function bindControls() {
  $('photoInput').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const url = URL.createObjectURL(file);
      await addPhoto(url, file.name);
    }
    $('status').textContent = `${e.target.files.length} photo(s) added — click one, then a panel.`;
    renderPreview();
  });

  document.querySelectorAll('#layoutRow button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      selectedPanel = 0;
      document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('on', b === btn));
      renderPreview();
    });
  });
  document.querySelectorAll('#gradeRow button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('on', b === btn));
      renderPreview();
    });
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); renderPreview(); });
  $('grainToggle').addEventListener('change', (e) => { state.grain = e.target.checked; renderPreview(); });
  $('vignetteToggle').addEventListener('change', (e) => { state.vignette = e.target.checked; renderPreview(); });
  $('zoomInput').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    renderPreview();
  });
  $('fillBtn').addEventListener('click', () => {
    state.panels.forEach((p, i) => { p.photo = pickedPhoto; p.zoom = 100 + (i % 3) * 15; });
    renderPreview();
  });
  $('shuffleBtn').addEventListener('click', () => {
    state.panels.forEach((p) => {
      p.zoom = 100 + Math.floor(Math.random() * 80);
      p.ox = (Math.random() - 0.5) * 0.7;
      p.oy = (Math.random() - 0.5) * 0.5;
    });
    renderPreview();
  });

  document.querySelectorAll('#sizeRow button').forEach((btn) => {
    btn.addEventListener('click', () => {
      exportSize = btn.dataset.size;
      document.querySelectorAll('#sizeRow button').forEach((b) => b.classList.toggle('on', b === btn));
    });
  });
  $('exportBtn').addEventListener('click', () => exportCover(exportSize));
  $('exportAllBtn').addEventListener('click', async () => {
    for (const size of Object.keys(SIZES)) await exportCover(size);
  });
}

/** Render and download one PNG export; also stashes it for the ?shot=cover view. */
function exportCover(sizeName) {
  return new Promise((resolve) => {
    const canvas = renderCoverCanvas(state, photos, sizeName);
    canvas.toBlob((blob) => {
      if (!blob) { $('status').textContent = 'Export failed — try again.'; resolve(null); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-coast-${sizeName}.png`;
      a.click();
      window.__lastExport = { size: sizeName, url, blob };
      $('status').textContent = `Exported ${sizeName} PNG — check your downloads.`;
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Screenshot staging (?shot=...): loads the samples, applies a preset, and either
 * shows the editor or fills the viewport with one rendered cover.
 *   ?shot=cover&size=1920x1080  — full-frame exported cover (landscape)
 *   ?shot=cover&size=1080x1350  — full-frame exported cover (portrait)
 *   ?shot=editor&layout=hero&grade=neon — editor with a preset applied
 */
async function applyShotMode() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  await loadSamples();
  const layout = q.get('layout');
  if (layout && LAYOUTS.includes(layout)) state.layout = layout;
  const grade = q.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const title = q.get('title');
  if (title) { state.title = title; $('titleInput').value = title; }
  if (shot === 'cover') {
    const size = q.get('size') || '1920x1080';
    const canvas = renderCoverCanvas(state, photos, size);
    document.body.classList.add('shot-mode');
    const shotCanvas = $('shotCanvas');
    shotCanvas.width = canvas.width;
    shotCanvas.height = canvas.height;
    shotCanvas.getContext('2d').drawImage(canvas, 0, 0);
    document.title = `Neon Coast cover — ${size}`;
    window.__shotReady = true;
    return;
  }
  // editor staging: sync the control highlights with the preset
  document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  renderPreview();
  window.__shotReady = true;
}

/** Boot: wire the editor, preload samples so the first paint already has art. */
async function boot() {
  bindPreview();
  bindControls();
  const q = new URLSearchParams(location.search);
  if (q.get('shot')) {
    await applyShotMode();
  } else {
    await loadSamples();
    renderPreview();
  }
  window.__appReady = true;
}

boot();
