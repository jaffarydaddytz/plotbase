import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// =====================================================
// PLOTBASE VITE CONFIGURATION
// =====================================================

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ===================================================
  // PATH ALIASES
  // ===================================================
  // Enables imports such as:
  //
  // import { Button } from "@/components/ui/button";
  // import { cn } from "@/lib/utils";
  //
  // Required for shadcn/ui and Loading UI components.
  // ===================================================

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // ===================================================
  // PRODUCTION CONFIGURATION
  // ===================================================

  esbuild: {
    drop:
      mode === "production"
        ? ["console", "debugger"]
        : [],
  },
}));