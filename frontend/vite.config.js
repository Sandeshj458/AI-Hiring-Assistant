import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev`, the React dev server runs on :5173 and proxies /api
// to the Express backend on :3000. In production, `npm run build` emits
// `dist/`, which the Express app serves directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
