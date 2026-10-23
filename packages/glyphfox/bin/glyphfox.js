#!/usr/bin/env node
import('../dist/cli/index.js')
  .then((cli) => cli.main(process.argv.slice(2)))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    process.stderr.write(`glyphfox: ${err && err.message ? err.message : err}\n`);
    process.exitCode = 1;
  });
