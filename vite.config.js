import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Real build time, not a runtime value — see App.jsx BUILD_TIME for why.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
