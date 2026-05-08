import botscript from "@mbfarias/botscript-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [botscript(), react()],
});
