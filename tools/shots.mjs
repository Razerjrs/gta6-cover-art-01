// Play-test + screenshot driver for Neon Coast (headless Chrome over CDP).
// Headless Chrome blocks localhost navigation, so pages are loaded via file://
// with --allow-file-access-from-files. Run: node tools/shots.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(here, '..');
const CHROME = '/opt/meta-chromium/chrome';
const WEBGL_FILE = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const WEBGL_SHA = '8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6';
const PORT = 9222;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('Chrome DevTools did not come up');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evalJs(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('JS error: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result?.value;
  }
}

async function shoot(scene) {
  const url = `file://${ROOT}/app/index.html${scene.query}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: scene.width, height: scene.height, deviceScaleFactor: 1, mobile: false,
  });
  // wait for the app to signal readiness
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      ready = await cdp.evalJs('!!window.__shotReady');
      if (ready) break;
    } catch { /* page still loading */ }
    await sleep(500);
  }
  if (!ready) throw new Error(`scene ${scene.name} never became ready`);
  await sleep(600);
  const errors = cdp.events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    .map((e) => e.params.entry.text);
  const exceptions = cdp.events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => JSON.stringify(e.params.exceptionDetails).slice(0, 300));
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const rawPath = join(ROOT, 'tools', 'raw', `${scene.name}.png`);
  writeFileSync(rawPath, Buffer.from(shot.data, 'base64'));
  console.log(`${scene.name}: ready, console errors=${errors.length + exceptions.length}`, [...errors, ...exceptions].slice(0, 3));
  ws.close();
  return { errors: [...errors, ...exceptions] };
}

const SCENES = [
  { name: '1-cover', query: '?shot=cover&size=1920x1080', width: 1280, height: 720 },
  { name: '2-editor', query: '?shot=editor&layout=grid&grade=sunset', width: 1280, height: 800 },
  { name: '3-cover', query: '?shot=cover&size=1080x1350', width: 1024, height: 1280 },
  { name: '4-sizes', query: '?shot=editor&layout=hero&grade=neon&title=NIGHT%20SHIFT', width: 1280, height: 800 },
];

mkdirSync(join(ROOT, 'tools', 'raw'), { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
  '--password-store=basic', '--use-mock-keychain',
  `--hatch-webgl-allowed-domains-file=${WEBGL_FILE}`,
  `--hatch-webgl-allowed-domains-sha256=${WEBGL_SHA}`,
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForDebugger();
  let allErrors = [];
  for (const scene of SCENES) {
    const r = await shoot(scene);
    allErrors = allErrors.concat(r.errors.map((e) => `${scene.name}: ${e}`));
  }
  console.log(allErrors.length === 0 ? 'PLAY-TEST: 0 console errors' : `PLAY-TEST: ${allErrors.length} console errors`);
} finally {
  chrome.kill('SIGKILL');
}
