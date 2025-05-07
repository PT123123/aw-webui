<template>
  <div
    :class="[styles['floating-action'], { [styles['dark-mode']]: isDarkMode }]"
    @click="$emit('fab-click')"
    data-testid="inbox-fab"
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
