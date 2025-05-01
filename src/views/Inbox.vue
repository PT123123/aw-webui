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
  mounted() {
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
  font-family: sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease; /* 添加过渡效果 */
}

#app {
  min-height: 100vh;
  background-color: #f0f2f5; /* 默认浅色背景 */
  color: #333; /* 默认深色文字 */
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app.dark-mode {
  background-color: #000000; /* 黑暗模式纯黑色背景 */
  color: #f5f5f5; /* 黑暗模式浅色文字 */
}

body.dark-mode {
  background-color: #000000; /* 黑暗模式纯黑色背景 */
  color: #f5f5f5; /* 黑暗模式浅色文字 */
}

/* 添加以下规则来设置 aw-container 在黑暗模式下的背景色 */
body.dark-mode .aw-container {
  background-color: #000000; /* 设置为黑色或其他你想要的深色 */
  color: #f5f5f5; /* 如果需要，设置文字颜色 */
}
</style>