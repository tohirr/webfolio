import { defineConfig } from "vite"

export default defineConfig({
  server: {
    // honor an assigned port (e.g. from launch tooling); default 5173
    port: Number(process.env.PORT) || 5173,
  },
})
