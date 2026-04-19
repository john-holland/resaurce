/**
 * Bundles @inventory/cave-federation-host for the static SPA (IIFE global).
 * Run from resaurce repo root: node scripts/bundle-spa-cave.mjs
 */
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const entry = path.join(root, '../inventory/packages/cave-federation-host/src/index.js');
const outfile = path.join(root, 'spa/public/cave-federation-host.js');

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'CaveFederationHost',
  platform: 'browser',
  outfile,
  logLevel: 'info',
});

console.log('Wrote', outfile);
