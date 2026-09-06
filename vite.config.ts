import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths. Required for the eventual desktop/Steam wrap, which
  // loads index.html over file:// where absolute "/assets/..." paths 404.
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
