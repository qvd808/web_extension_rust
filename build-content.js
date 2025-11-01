const esbuild = require('esbuild');
const path = require('path');

// Mode: prod by default; switch to dev via env or CLI args
const args = process.argv.slice(2);
const isDev =
  process.env.BUILD_MODE === 'dev' ||
  args.includes('dev') ||
  args.includes('--dev') ||
  args.includes('--mode=dev');

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
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    legalComments: isDev ? 'inline' : 'none',
    drop: isDev ? [] : ['console', 'debugger'],
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
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    legalComments: isDev ? 'inline' : 'none',
    drop: isDev ? [] : ['console', 'debugger'],
    logLevel: 'info',
  });

  // 3) Vim display → ESM module (dynamic import target)
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'vim_display.js')],
    bundle: true,
    outfile: path.join(distDir, 'vim_display.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    legalComments: isDev ? 'inline' : 'none',
    drop: isDev ? [] : ['console', 'debugger'],
    logLevel: 'info',
  });

  console.log(`✅ Built bootstrap, DOM logic, and Vim display (${isDev ? 'dev' : 'prod'})`);
}

build().catch(() => process.exit(1));
