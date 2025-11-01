const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'extension/js/main.js')],
  bundle: true,
  outfile: path.join(__dirname, 'extension/js/content.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'info',
}).then(() => {
  console.log('✅ Content script built successfully!');
}).catch(() => process.exit(1));
