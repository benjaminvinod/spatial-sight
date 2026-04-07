import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true, // This is the key to stopping the white screen in Mozilla
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  },
  build: { target: 'esnext' }
});