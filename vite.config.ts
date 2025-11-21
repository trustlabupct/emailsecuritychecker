import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        'service-worker': 'src/service-worker/index.ts',
        'content-script': 'src/content/index.ts',
        'gmail-injected': 'src/content/gmail-injected.ts',
        offscreen: 'src/offscreen/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'es',
        // Prevent code splitting - inline all dependencies
        inlineDynamicImports: true,
      },
    },
    // Build each entry separately to allow inlineDynamicImports
    emptyOutDir: true,
    target: 'es2020',
    minify: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
