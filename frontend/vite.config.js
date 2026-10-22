import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Development: `npm run dev` serves the app on http://localhost:5173 and forwards
// every /api request to the Flask server on port 5000 (so no CORS problems).
// Production:  `npm run build` creates frontend/dist, which Flask serves itself.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/ui/button" means "src/components/ui/button" (used by shadcn/ui)
    alias: { "@": path.resolve(dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
});
