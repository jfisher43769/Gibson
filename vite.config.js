import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";

// package.json is the single source of truth for the version the footer shows, so the
// number can't drift from the package the way the old hand-typed "1.08" did.
const { version } = createRequire(import.meta.url)("./package.json");

export default defineConfig({
  plugins: [react()],
  define: {
    // Real build time, not a runtime value — see App.jsx BUILD_TIME for why.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(version),
  },
});
