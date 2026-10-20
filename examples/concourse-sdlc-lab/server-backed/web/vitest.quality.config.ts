import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/features/quality/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
  },
})
