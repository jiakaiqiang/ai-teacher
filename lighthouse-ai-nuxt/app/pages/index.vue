<script setup lang="ts">
const features = [
  { icon: '🚀', title: '性能分析', desc: '使用 Lighthouse 分析网站核心性能指标' },
  { icon: '🤖', title: 'AI 建议', desc: 'AI 解读报告并生成可执行的优化方案' },
  { icon: '📊', title: '可视化', desc: '直观展示 FCP、LCP 等关键数据' },
]

const stats = [
  { value: '90+', label: '性能评分目标' },
  { value: '1.8s', label: 'FCP 优化目标' },
  { value: '2.1s', label: 'LCP 优化目标' },
]
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <div class="container mx-auto px-4 py-16">
      <!-- Hero -->
      <section class="text-center mb-20">
        <h1 class="text-5xl font-bold text-gray-900 mb-4">
          Lighthouse AI Analyzer
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          AI 驱动的网站性能分析工具
        </p>
        <button
          class="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors"
        >
          开始分析
        </button>
      </section>

      <!-- Features -->
      <section class="grid md:grid-cols-3 gap-8 mb-20">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div class="text-3xl mb-3">{{ feature.icon }}</div>
          <h3 class="text-xl font-semibold mb-2">{{ feature.title }}</h3>
          <p class="text-gray-600">{{ feature.desc }}</p>
        </div>
      </section>

      <!-- Stats -->
      <section class="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="text-3xl font-bold text-blue-600">{{ stat.value }}</div>
          <div class="text-sm text-gray-500 mt-1">{{ stat.label }}</div>
        </div>
      </section>
    </div>
  </main>
</template>
