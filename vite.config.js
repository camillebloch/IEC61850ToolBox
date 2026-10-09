import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: env.GITHUB_ACTIONS ? '/IEC61850ToolBox/' : process.env.VITE_BASE || '/IEC61850ToolBox/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})