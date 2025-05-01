import 'core-js/stable';
import 'regenerator-runtime/runtime';

import Vue from 'vue';

// Load the Bootstrap CSS
import BootstrapVue from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
Vue.use(BootstrapVue);

import { Datetime } from 'vue-datetime';
import 'vue-datetime/dist/vue-datetime.css';
Vue.component('Datetime', Datetime);

// Load the Varela Round font
import 'typeface-varela-round';

// Load the main style
import './style/style.scss';

// Loads all the filters
import './util/filters.js';

// Sets up the routing and the base app (using vue-router)
import router from './route.js';

// Sets up the pinia store
import pinia from './stores';

// Register Font Awesome icon component
Vue.component('Icon', () => import('vue-awesome/components/Icon.vue'));

// General components
Vue.component('ErrorBoundary', () => import('./components/ErrorBoundary.vue'));
Vue.component('InputTimeinterval', () => import('./components/InputTimeInterval.vue'));
Vue.component('AwHeader', () => import('./components/Header.vue'));
Vue.component('AwFooter', () => import('./components/Footer.vue'));
Vue.component('AwDevonly', () => import('./components/DevOnly.vue'));
Vue.component('AwSelectableVis', () => import('./components/SelectableVisualization.vue'));
Vue.component('AwSelectableEventview', () => import('./components/SelectableEventView.vue'));
Vue.component('NewReleaseNotification', () => import('./components/NewReleaseNotification.vue'));
Vue.component('UserSatisfactionPoll', () => import('./components/UserSatisfactionPoll.vue'));
Vue.component('AwQueryOptions', () => import('./components/QueryOptions.vue'));
Vue.component('AwSelectCategories', () => import('./components/SelectCategories.vue'));
Vue.component('AwSelectCategoriesOrPattern', () =>
  import('./components/SelectCategoriesOrPattern.vue')
);

// Visualization components
Vue.component('AwSummary', () => import('./visualizations/Summary.vue'));
Vue.component('AwPeriodusage', () => import('./visualizations/PeriodUsage.vue'));
Vue.component('AwEventlist', () => import('./visualizations/EventList.vue'));
Vue.component('AwSunburstCategories', () => import('./visualizations/SunburstCategories.vue'));
Vue.component('AwSunburstClock', () => import('./visualizations/SunburstClock.vue'));
Vue.component('AwTimelineInspect', () => import('./visualizations/TimelineInspect.vue'));
Vue.component('AwTimeline', () => import('./visualizations/TimelineSimple.vue'));
Vue.component('VisTimeline', () => import('./visualizations/VisTimeline.vue'));
Vue.component('AwCategorytree', () => import('./visualizations/CategoryTree.vue'));
Vue.component('AwTimelineBarchart', () => import('./visualizations/TimelineBarChart.vue'));
Vue.component('AwCalendar', () => import('./visualizations/Calendar.vue'));
Vue.component('AwCustomVis', () => import('./visualizations/CustomVisualization.vue'));
Vue.component('AwScore', () => import('./visualizations/Score.vue'));

// A mixin to make async method errors propagate
import asyncErrorCapturedMixin from './mixins/asyncErrorCaptured.js';
Vue.mixin(asyncErrorCapturedMixin);

// Set the PRODUCTION constant
// FIXME: Thould follow Vue convention and start with a $.
Vue.prototype.PRODUCTION = process.env.NODE_ENV === 'production';
Vue.prototype.COMMIT_HASH = process.env.COMMIT_HASH || 'dev';

// Set the $isAndroid constant
Vue.prototype.$isAndroid = process.env.VUE_APP_ON_ANDROID;

// Create an instance of AWClient as this.$aw
// NOTE: needs to be created before the Vue app is created,
//       since stores rely on it having been run.
import { createClient, getClient, configureClient } from './util/awclient';
createClient();

// Setup Vue app
import App from './App.vue';
new Vue({
  el: '#app',
  router: router,
  render: h => h(App),
  pinia,
});

// Set the $aw global
Vue.prototype.$aw = getClient();

// Must be run after vue init since it relies on the settings store
configureClient();

/* 删除以下重复的Vue3初始化代码 */
// import { createApp } from 'vue'
// import App from './App.vue'
// import router from './route'
// import { createPinia } from 'pinia'
// 
// const app = createApp(App)
// app.use(router)
// app.use(createPinia())
// app.mount('#app')

// 在Vue实例创建前添加
Vue.filter('formatDate', function(value) {
  if (!value) return ''
  return moment(value).format('YYYY-MM-DD HH:mm')
})
