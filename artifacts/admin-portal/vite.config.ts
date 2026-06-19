import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT ?? "3001");
  if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: ${env.PORT}`);

  return {
    base: env.BASE_PATH ?? "/",
    define: {
      "import.meta.env.BACKEND_URL": JSON.stringify(env.BACKEND_URL ?? ""),
    },
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
          ]
        : []),
    ],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": { target: "http://localhost:8080", changeOrigin: true, secure: false },
      },
    },
    preview: { port, host: "0.0.0.0", allowedHosts: true },
  };
});
