import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  build: {
    outDir: __dirname,
    rollupOptions: {
      input: resolve(__dirname, 'overlay-ui.jsx'),
      output: { entryFileNames: 'overlay-ui.js' }
    }
  },
  plugins: [react()],
});