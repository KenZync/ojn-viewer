// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: "netlify",
  },
  modules: ["@nuxtjs/tailwindcss", "nuxt-headlessui", "@hypernym/nuxt-anime"],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
});
