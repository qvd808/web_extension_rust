const esbuild = require('esbuild');
const path = require('path');

async function build() {
  const srcDir = path.join(__dirname, 'extension/js/src');
  const distDir = path.join(__dirname, 'extension/js/dist');

  // 1) Bootstrap → IIFE content script (single file)
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'main.js')],
    bundle: true,
    outfile: path.join(distDir, 'content.js'),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'info',
  });

  // 2) DOM logic → ESM module (dynamic import target)
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'dom_logic.js')],
    bundle: true,
    outfile: path.join(distDir, 'dom_logic.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'info',
  });

  console.log('✅ Built bootstrap and DOM logic');
}

build().catch(() => process.exit(1));
