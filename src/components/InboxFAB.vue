<template>
  <div
    :class="[styles['floating-action'], { [styles['dark-mode']]: isDarkMode }]"
    @click="$emit('fab-click')"
  >
    <span>+</span>
  </div>
</template>

<script>
export default {
  name: 'InboxFAB',
  props: {
    isDarkMode: Boolean,
    styles: Object
  }
};
</script>
