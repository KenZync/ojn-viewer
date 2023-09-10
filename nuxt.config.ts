export default defineNuxtConfig({
  nitro: {
    preset: "netlify",
  },
  modules: [
    "@nuxtjs/tailwindcss",
    "nuxt-headlessui",
    "@hypernym/nuxt-anime",
  ],
  vite: {
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
    server: {
      headers: {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
  },
});
