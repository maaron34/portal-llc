import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// DRIVEWAY_MOCK=1 (npm run dev:driveway-mock) adds a local stand-in for the
// Driveway Generator's server calls. Dev server only; never part of a build.
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react(), tailwindcss()]
  if (command === 'serve' && process.env.DRIVEWAY_MOCK) {
    const { drivewayMock } = await import('./scripts/driveway-mock')
    plugins.push(drivewayMock())
  }
  return { plugins }
})
