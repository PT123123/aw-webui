<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      class="toast-container"
      :class="[positionClass, { 'dark-mode': isDarkMode }]"
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <div class="toast-body">
        <span class="toast-message">{{ message }}</span>
        <button
          v-if="actionText"
          class="toast-action"
          @click="handleAction"
        >
          {{ actionText }}
        </button>
        <button
          class="toast-close"
          @click="close"
        >
          ×
        </button>
      </div>
      <div
        v-if="showProgress"
        class="toast-progress-bar"
      >
        <div
          class="toast-progress"
          :style="{ width: progressWidth + '%', 'animation-duration': duration + 'ms', 'animation-play-state': paused ? 'paused' : 'running' }"
        />
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'Toast',
  props: {
    message: {
      type: String,
      required: true,
    },
    actionText: {
      type: String,
      default: '',
    },
    onAction: {
      type: Function,
      default: undefined,
    },
    duration: {
      type: Number,
      default: 5000,
    },
    position: {
      type: String,
      default: 'bottom-center',
      validator: function (value) {
        return ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].indexOf(value) !== -1;
      },
    },
    isDarkMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['closed', 'action'],
  data: function () {
    return {
      visible: true,
      showProgress: true,
      paused: false,
      progressWidth: 100,
      remainingTime: this.duration,
      startTime: null,
      timeoutId: null,
      rafId: null,
    };
  },
  computed: {
    positionClass: function () {
      return 'toast-' + this.position;
    },
  },
  mounted: function () {
    this.startTimer();
  },
  beforeUnmount: function () {
    this.clearTimers();
  },
  methods: {
    clearTimers: function () {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },
    startTimer: function () {
      this.startTime = Date.now();
      this.paused = false;
      // 进度条动画
      this.animateProgress();
      // 倒计时关闭
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(this.close, this.remainingTime);
    },
    animateProgress: function () {
      const tick = function () {
        if (!this.visible) return;
        if (!this.paused) {
          const elapsed = Date.now() - this.startTime;
          this.progressWidth = Math.max(0, 100 - (elapsed / this.duration) * 100);
          if (this.progressWidth <= 0) return;
        }
        this.rafId = requestAnimationFrame(tick);
      }.bind(this);
      this.rafId = requestAnimationFrame(tick);
    },
    pauseTimer: function () {
      if (!this.visible || this.paused) return;
      this.paused = true;
      const elapsed = Date.now() - this.startTime;
      this.remainingTime = Math.max(0, this.remainingTime - elapsed);
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },
    resumeTimer: function () {
      if (!this.visible || !this.paused) return;
      this.paused = false;
      this.startTime = Date.now();
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(this.close, this.remainingTime);
    },
    handleAction: function () {
      this.$emit('action');
      if (typeof this.onAction === 'function') {
        this.onAction();
      }
      this.visible = false;
      this.clearTimers();
      this.$emit('closed');
    },
    close: function () {
      this.visible = false;
      this.clearTimers();
      this.$emit('closed');
    },
  },
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  min-width: 260px;
  max-width: 90vw;
  background-color: #333;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.toast-bottom-center {
  bottom: 32px;
}
.toast-top-center {
  top: 32px;
}
.toast-bottom-left {
  bottom: 32px;
  left: 32px;
  transform: none;
}
.toast-bottom-right {
  bottom: 32px;
  left: auto;
  right: 32px;
  transform: none;
}
.toast-top-left {
  top: 32px;
  left: 32px;
  transform: none;
}
.toast-top-right {
  top: 32px;
  left: auto;
  right: 32px;
  transform: none;
}
.toast-container.dark-mode {
  background-color: #2a2a3e;
}
.toast-body {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}
.toast-message {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toast-action {
  background: none;
  border: none;
  color: #7c8cff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}
.toast-action:hover {
  background-color: rgba(124, 140, 255, 0.15);
}
.toast-close {
  background: none;
  border: none;
  color: #aaa;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
}
.toast-close:hover {
  color: #fff;
}
.toast-progress-bar {
  height: 3px;
  background-color: rgba(255, 255, 255, 0.15);
}
.toast-progress {
  height: 100%;
  background-color: #7c8cff;
  transition: none;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
}
</style>
