<template>
  <visualization-base 
    type="bar-chart"
    :data="chartData"
    @init="initChart"
    @update="updateChart"
  />
</template>

<script>
import { create, update } from '../visualizations/bar-chart.js'

export default {
  methods: {
    initChart(el) {
      create(el);
    },
    updateChart(el, data) {
      update(el, data);
    }
  }
}
</script>