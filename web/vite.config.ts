import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        // Proxy /api và /ws tới Express backend (port 3789)
        proxy: {
            "/api": "http://localhost:3789",
            "/ws": { target: "ws://localhost:3789", ws: true },
        },
    },
});
