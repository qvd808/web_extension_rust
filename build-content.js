const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'extension/js/src/main.js')],
  bundle: true,
  outfile: path.join(__dirname, 'extension/js/dist/content.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'info',
}).then(() => {
  console.log('✅ Content script built successfully!');
}).catch(() => process.exit(1));
