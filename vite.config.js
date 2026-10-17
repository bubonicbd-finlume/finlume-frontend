import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/@supabase")) return "supabase";
        },
      },
    },
  },
});
