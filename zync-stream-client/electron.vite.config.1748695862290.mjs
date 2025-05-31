// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var __electron_vite_injected_dirname = "C:\\Users\\raezi\\dev\\zync-stream\\zync-stream-client";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/preload/index.ts"),
          "overlay-preload": resolve(__electron_vite_injected_dirname, "src/preload/overlay-preload.ts")
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve(__electron_vite_injected_dirname, "src/renderer/src")
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/renderer/index.html"),
          overlay: resolve(__electron_vite_injected_dirname, "src/renderer/overlay.html")
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
