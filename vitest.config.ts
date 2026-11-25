import { defineConfig } from "vitest/config";

// Server-side tests only (netlify/lib). One worker: the Mac that runs these has
// 16 GB and the gate tests decode a few dozen photos.
export default defineConfig({
  test: {
    include: ["netlify/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
