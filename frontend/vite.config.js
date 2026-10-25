import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api requests are proxied to the Django server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
