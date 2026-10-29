import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Chrome locks its test profile files; they are not application source.
    watch: { ignored: ['**/.qa/**', '**/.npm-cache/**'] },
  },
});
