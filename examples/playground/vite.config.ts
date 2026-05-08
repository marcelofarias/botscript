import botscript from "@mbfarias/botscript-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `base` is set so GitHub Pages serves the playground correctly at
// https://marcelofarias.github.io/botscript/. For local dev (vite dev server)
// or any host that serves at the root, set BS_BASE=/ or unset.
export default defineConfig({
  base: process.env.BS_BASE ?? "/botscript/",
  plugins: [botscript(), react()],
});
