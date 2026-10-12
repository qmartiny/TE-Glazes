import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base + hash routing means the built site works from any path
// (GitHub Pages project sites, Netlify, a sub-folder, ...).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
