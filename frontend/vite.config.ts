import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind-mounted volumes in Docker on macOS do not reliably emit file events.
    watch: { usePolling: true, interval: 300 }
  }
});
