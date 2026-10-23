'use strict';
// Regenerates icon.png and the README screenshots in images/ with headless
// Chrome. The screenshots use the extension's own renderHtml on samples/.
// Run: node scripts/images.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME || 'google-chrome';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'driftglass-images-'));

// extension.js requires "vscode", which only exists inside the editor.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === 'vscode' ? request : resolve.call(this, request, ...rest);
};
require.cache.vscode = { id: 'vscode', filename: 'vscode', loaded: true, exports: {} };
const { renderHtml } = require(path.join(ROOT, 'extension.js'));

// VS Code "Dark Modern" colors for the webview's theme variables.
const THEME = `<style>:root {
  --vscode-editor-background: #1f1f1f;
  --vscode-editor-foreground: #cccccc;
  --vscode-sideBar-background: #181818;
  --vscode-panel-border: #2b2b2b;
}</style>`;

function shoot(html, out, width, height, scale) {
  const page = path.join(TMP, path.basename(out) + '.html');
  fs.writeFileSync(page, html);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--default-background-color=00000000',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    `file://${page}`,
  ], { stdio: 'ignore' });
  console.log('wrote', path.relative(ROOT, out));
}

function screenshot(sample, out) {
  const text = fs.readFileSync(path.join(ROOT, 'samples', sample), 'utf8');
  const settings = { get: (_key, fallback) => fallback };
  const html = renderHtml(text, settings).replace('<head>', `<head>${THEME}`);
  shoot(html, path.join(ROOT, 'images', out), 1100, 640, 2);
}

const svg = path.join(ROOT, 'images', 'icon.svg');
shoot(
  `<html><body style="margin:0;background:transparent"><img src="file://${svg}" width="256" height="256" style="display:block"></body></html>`,
  path.join(ROOT, 'icon.png'),
  256,
  256,
  1
);
screenshot('feature.diff', 'git-diff.png');
screenshot('release.helmdiff', 'helm-diff.png');

fs.rmSync(TMP, { recursive: true, force: true });
