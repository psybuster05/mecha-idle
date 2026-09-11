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
    // Not vitest's 5s default. This suite simulates hours of game time, and on an idle
    // machine the two offline-drift tests take ~4.2s and ~3.9s - already at the edge.
    // Under load it is worse: a combat test that normally takes 1.4s timed out at 5s
    // while a dev server and a build were running, then passed untouched on a re-run.
    //
    // A random timeout here is not harmless, because the deploy runs this suite. It
    // would block a fix from shipping at exactly the worst moment - mid-playtest, with
    // somebody waiting on it. 30s is headroom for a slow CI runner, not a performance
    // budget: a test that is genuinely getting slower shows up in the suite's duration
    // long before it gets anywhere near this.
    testTimeout: 30_000,
  },
})
