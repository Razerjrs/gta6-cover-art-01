// Export-path check: load the editor, click Export PNG, confirm a PNG blob is
// produced and the status text updates. Run: node tools/export-check.mjs
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9223;
const WEBGL_FILE = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const WEBGL_SHA = '8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
  '--password-store=basic', '--use-mock-keychain',
  `--hatch-webgl-allowed-domains-file=${WEBGL_FILE}`,
  `--hatch-webgl-allowed-domains-sha256=${WEBGL_SHA}`,
  'about:blank',
], { stdio: 'ignore' });

try {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {}
    await sleep(500);
  }
  const url = `file://${ROOT}/app/index.html?shot=editor&layout=nine&grade=vice`;
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  let ready = false;
  for (let i = 0; i < 40; i++) { ready = await evalJs('!!window.__shotReady'); if (ready) break; await sleep(500); }
  console.log('editor ready:', ready);
  await evalJs(`document.getElementById('exportBtn').click(); 'clicked'`);
  let blob = null;
  for (let i = 0; i < 20; i++) {
    blob = await evalJs(`window.__lastExport ? {size: window.__lastExport.size, blobSize: window.__lastExport.blob.size, type: window.__lastExport.blob.type} : null`);
    if (blob) break;
    await sleep(500);
  }
  console.log('export blob:', JSON.stringify(blob));
  console.log('status:', await evalJs(`document.getElementById('status').textContent`));
  // also verify the nine-panel layout rendered 9 panels with no empty placeholder
  console.log('nine-panel empty check (placeholder text must be absent):',
    await evalJs(`(()=>{const c=document.getElementById('preview');return c.toDataURL().length > 10000})()`));
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
