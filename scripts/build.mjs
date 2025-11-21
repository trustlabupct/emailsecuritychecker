import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

async function buildEntry(entryName, entryPath, options = {}) {
  console.log(`Building ${entryName}...`);

  const config = {
    configFile: false,
    root: rootDir,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, entryPath),
        formats: ['es'],
        fileName: () => `${entryName}.js`,
      },
      rollupOptions: {
        output: {
          format: 'es',
          inlineDynamicImports: true,
          ...options.output,
        },
        external: options.external || [],
      },
      target: 'es2020',
      minify: options.minify !== false,
    },
  };

  await build(config);
  console.log(`✓ Built ${entryName}`);
}

async function buildAll() {
  try {
    // Clean dist directory first
    console.log('Cleaning dist directory...');
    await build({
      configFile: false,
      root: rootDir,
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            popup: resolve(rootDir, 'index.html'),
            offscreen: resolve(rootDir, 'offscreen.html'),
          },
        },
      },
    });

    // Build content scripts with all dependencies inlined
    await buildEntry('content-script', 'src/content/index.ts', {
      minify: false,
    });

    await buildEntry('gmail-injected', 'src/content/gmail-injected.ts', {
      minify: false,
    });

    // Build service worker with dependencies inlined
    await buildEntry('service-worker', 'src/service-worker/index.ts', {
      minify: false,
    });

    await buildEntry('offscreen', 'src/offscreen/index.ts', {
      minify: false,
    });

    console.log('\n✓ All builds completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAll();
