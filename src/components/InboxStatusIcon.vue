<template>
  <span
    data-testid="inbox-status-icon"
    :class="[styles['status-icon'], styles[statusIconClass]]"
    :title="inboxStatus"
  >
    {{ statusIconContent }}
  </span>
</template>

<script>
export default {
  name: 'InboxStatusIcon',
  props: {
    statusIconClass: {
      type: String,
      required: true
    },
    statusIconContent: {
      type: String,
      required: true
    },
    inboxStatus: {
      type: String,
      required: true
    },
    styles: {
      type: Object,
      required: true
    }
  }
};
</script>
