import botscript from "@mbfarias/botscript-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The playground is served at https://botscript.org/ (custom domain on GitHub
// Pages), so `base` is `/`. Override with BS_BASE if hosting under a subpath.
export default defineConfig({
  base: process.env.BS_BASE ?? "/",
  plugins: [botscript(), react()],
});
