import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "/Users/akaempf/little-coder",
  test: {
    include: [".pi/extensions/**/*.test.ts", "bin/**/*.test.mjs", "scripts/**/*.test.mjs"],
    exclude: [
      ".pi/extensions/**/*.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
    deps: {
      // Exclude the nvim directory from glob scanning
      interopDefault: true,
    },
  },
  // Exclude the nvim directory from glob scanning
  server: {
    fs: {
      // Restrict Vite's filesystem scanning to the project root only,
      // preventing it from walking up to ~/.local/share/nvim
      allow: ["/Users/akaempf/little-coder"],
    },
  },
});
