import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: './src',
  base: './', // Make asset paths relative for Electron file:// protocol
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'bittorrent-dht',
        'torrent-discovery',
        'bittorrent-tracker',
        'parse-torrent',
        'run-parallel',
      ],
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      events: 'events',
      path: 'path-browserify',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: [
      'events',
      'path-browserify',
      'crypto-browserify',
      'stream-browserify',
      'buffer',
    ],
  },
  server: {
    port: 5173,
    open: false,
  },
});
