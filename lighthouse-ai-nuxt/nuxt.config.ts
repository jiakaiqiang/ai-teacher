// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Lighthouse AI Analyzer',
      meta: [
        { name: 'description', content: 'AI 驱动的网站性能分析工具' }
      ]
    }
  }
})
