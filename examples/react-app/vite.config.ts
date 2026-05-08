import botscript from "@botscript/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [botscript(), react()],
  resolve: {
    extensions: [".bs", ".tsx", ".ts", ".jsx", ".js", ".json"],
  },
});
