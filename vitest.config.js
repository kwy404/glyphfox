import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { astroForTests } from './test/stubs/astro-plugin.js';

const stub = (name) => fileURLToPath(new URL(`./test/stubs/${name}.js`, import.meta.url));

export default defineConfig({
  plugins: [svelte({ emitCss: false }), astroForTests()],
  resolve: {
    // react-native needs a device runtime: the native tests render against stand ins.
    alias: [
      { find: /^react-native$/, replacement: stub('react-native') },
      { find: /^react-native-svg$/, replacement: stub('react-native-svg') },
    ],
  },
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
