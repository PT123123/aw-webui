<template>
  <div
    id="app"
    :class="{ 'dark-mode': isDarkMode }"
  >
    <inbox-component
      :is-dark-mode="isDarkMode"
      @toggle-dark-mode="toggleDarkMode"
    />
  </div>
</template>

<script>
import InboxComponent from '../components/InboxView.vue'

export default {
  components: {
    InboxComponent
  },
  data() {
    return {
      isDarkMode: true // 设置默认开启黑暗模式
    }
  },
  watch: {
    isDarkMode(newVal) {
      document.body.classList.toggle('dark-mode', newVal);
    }
  },
  created() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  },
  methods: {
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    }
  }
}
</script>

<style>
/* 全局样式 */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
  background-color: #faf9f5;
  color: #333;
}

body.dark-mode {
  background-color: #1a1a2e;
  color: #e0e0e0;
}

#app {
  min-height: 100vh;
  background-color: transparent;
  color: #333;
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app.dark-mode {
  background-color: transparent;
  color: #e0e0e0;
}

body.dark-mode .aw-container {
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  background-color: transparent !important;
  color: #e0e0e0 !important;
}

.aw-container {
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  background-color: transparent !important;
}
</style>