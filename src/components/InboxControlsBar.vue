<template>
  <div :class="[styles['controls'], { [styles['dark-mode']]: isDarkMode }]">
    <slot name="status-icon" />
    <div class="sort-options">
      <button
        @click="$emit('sort-by', 'created')"
        :class="{ [styles['active']]: sortMethod === 'created' }"
      >
        按创建时间
      </button>
      <button
        @click="$emit('sort-by', 'updated')"
        :class="{ [styles['active']]: sortMethod === 'updated' }"
      >
        按修改时间
      </button>
    </div>
    <button
      @click="() => $emit('refresh-data')"
      data-testid="refresh-btn"
      :class="[styles['refresh-btn'], { [styles['dark-mode']]: isDarkMode }]"
    >
      刷新
    </button>
  </div>
</template>

<script>
export default {
  name: 'InboxControlsBar',
  props: {
    sortMethod: String,
    isDarkMode: Boolean,
    styles: Object
  }
};
</script>
