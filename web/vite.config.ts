import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages: the project website (index.html) and the game (jouer.html); docs/website.md §8.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("index.html", import.meta.url)),
        jouer: fileURLToPath(new URL("jouer.html", import.meta.url)),
      },
    },
  },
});
