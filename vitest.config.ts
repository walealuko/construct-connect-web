import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Use happy-dom for tests that need Request/Response/Headers
  // (proxy.rateLimit.test.ts). Pure-helper tests don't care about
  // the env, but a single env keeps config simple.
  test: {
    environment: "happy-dom",
    // Include .test.ts files anywhere in the tree, plus the
    // verify-route co-located test in __tests__/.
    include: ["**/*.test.ts", "**/__tests__/**/*.test.ts"],
    // .next/, node_modules/, and Next's generated types are noise.
    exclude: ["node_modules/**", ".next/**", ".git/**"],
        // Run sequentially — the in-memory rate limiter would otherwise
    // see concurrent buckets that reset mid-suite. Each test that
    // touches the rate limiter calls __resetForTests() in beforeEach
    // to keep cross-test isolation.
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});