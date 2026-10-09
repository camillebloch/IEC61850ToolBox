import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base:
    mode === 'schneider'
      ? '/SESA160638/IEC61850ToolBox/'
      : '/IEC61850ToolBox/',

  plugins: [
    react(),
    tailwindcss(),
  ],
}))