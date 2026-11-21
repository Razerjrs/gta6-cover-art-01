// Neon Coast Cover Studio — gta6-cover-art-01 entry (Node 22, standard library only).
// The program hands in the app: it copies app/ and screenshots/ from beside this
// file into the output directory and writes /output/dossier.json with the vendored
// make.fun library (vendor/makefun-app.ts, copied from the kit unchanged).
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps (reference/gate.json): only text_max_bytes shapes the dossier's
// bytes; the rest make this program fail where the sealed scorer would refuse the
// entry (more than 4 screenshots, one over 256 KiB, app/ over 993 files or 48 MiB,
// or a path under app/ over 1000 bytes). Deterministic: same tree, same bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
