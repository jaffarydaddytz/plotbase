import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],

  esbuild: {
    // This removes console.log and console.info, but keeps console.warn and console.error
    drop: ['console', 'debugger'], 
  },
})
