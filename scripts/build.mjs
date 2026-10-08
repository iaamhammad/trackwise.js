import { build } from 'esbuild';
import { stat } from 'node:fs/promises';

const shared = {
  entryPoints: ['src/index.js'],
  bundle: true,
  target: ['es2018'],
  logLevel: 'info',
  legalComments: 'none'
};

const iifeFooter = `
;if (typeof TrackWise !== 'undefined' && TrackWise && TrackWise.default) {
  TrackWise = TrackWise.default;
}
if (typeof window !== 'undefined' && typeof TrackWise !== 'undefined') {
  window.TrackWise = TrackWise;
}
`;

const cjsFooter = `
;var __twExports = module.exports;
if (__twExports && __twExports.default) {
  var __twApi = __twExports.default;
  for (var __twKey in __twExports) {
    if (__twKey !== 'default') __twApi[__twKey] = __twExports[__twKey];
  }
  __twApi.default = __twApi;
  module.exports = __twApi;
}
`;

const targets = [
  {
    name: 'ESM (minified)',
    options: { format: 'esm', outfile: 'dist/trackwise.esm.js', minify: true }
  },
  {
    name: 'CJS (minified)',
    options: { format: 'cjs', outfile: 'dist/trackwise.cjs', minify: true, footer: { js: cjsFooter } }
  },
  {
    name: 'IIFE (minified)',
    options: {
      format: 'iife',
      globalName: 'TrackWise',
      outfile: 'dist/trackwise.min.js',
      minify: true,
      footer: { js: iifeFooter }
    }
  },
  {
    name: 'IIFE (readable)',
    options: {
      format: 'iife',
      globalName: 'TrackWise',
      outfile: 'dist/trackwise.js',
      minify: false,
      footer: { js: iifeFooter }
    }
  }
];

async function main() {
  for (const target of targets) {
    await build({ ...shared, ...target.options });
    const size = (await stat(target.options.outfile)).size;
    console.log(`  ${target.name.padEnd(18)} ${target.options.outfile}  ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
