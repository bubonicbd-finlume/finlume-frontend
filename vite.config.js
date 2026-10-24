import { defineConfig } from "vite";

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/outputs/**", "**/work/**"],
    },
  },
  build: {
    // Production artifacts are uploaded as-is. Keep source maps out of the public bundle.
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-is")) return "react-core";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/@supabase")) return "supabase";
        },
      },
    },
  },
});
