import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // For GitHub Pages the workflow sets VITE_BASE; e.g. /crazydice/ for https://user.github.io/crazydice/
  base: process.env.VITE_BASE ?? '/',
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: true,
  },
});
