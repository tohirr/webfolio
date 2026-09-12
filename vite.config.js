import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  server: {
    // honor an assigned port (e.g. from launch tooling); default 5173
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      // three pages: the portfolio, the glass camera at /glass/, the ice cube at /cube/
      input: {
        main: page("index.html"),
        glass: page("glass/index.html"),
        cube: page("cube/index.html"),
      },
    },
  },
})
