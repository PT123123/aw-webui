<template lang="pug">
div(:class="{'fixed-top-padding': fixedTopMenu}")
  b-navbar.aw-navbar(toggleable="lg" :fixed="fixedTopMenu ? 'top' : null" ref="navbar")
    // Brand on mobile
    b-navbar-nav.d-block.d-lg-none
      b-navbar-brand(to="/" style="background-color: transparent;")
        img.aligh-middle(src="/logo.png" style="height: 1.5em;")
        span.ml-2.align-middle(style="font-size: 1em; color: #000;") ActivityWatch

    b-navbar-toggle(target="nav-collapse")

    b-collapse#nav-collapse(is-nav)
      b-navbar-nav
        // If only a single view (the default) is available
        b-nav-item(v-if="activityViews && activityViews.length === 1", v-for="view in activityViews", :key="view.name", :to="view.pathUrl")
          div.px-2.px-lg-1
            icon(name="calendar-day")
            | Activity

        // If multiple (or no) activity views are available
        b-nav-item-dropdown(v-if="!activityViews || activityViews.length !== 1")
          template(slot="button-content")
            div.d-inline.px-2.px-lg-1
              icon(name="calendar-day")
              | Activity
          b-dropdown-item(v-if="activityViews === null", disabled)
            span.text-muted Loading...
            br
          b-dropdown-item(v-else-if="activityViews && activityViews.length <= 0", disabled)
            | No activity reports available
            br
            small Make sure you have both an AFK and window watcher running
          b-dropdown-item(v-for="view in activityViews", :key="view.name", :to="view.pathUrl")
            icon(:name="view.icon")
            | {{ view.name }}

        b-nav-item(to="/timeline" style="font-color: #000;")
          div.px-2.px-lg-1
            icon(name="stream")
            | Timeline

        b-nav-item(to="/stopwatch")
          div.px-2.px-lg-1
            icon(name="stopwatch")
            | Stopwatch
            
        // 新增Inbox项（复用database图标）
        b-nav-item(to="/inbox")
          div.px-2.px-lg-1
            icon(name="database")
            | Inbox

      // Brand on large screens (centered)
      b-navbar-nav.abs-center.d-none.d-lg-block
        b-navbar-brand(to="/" style="background-color: transparent;")
          img.ml-0.aligh-middle(src="/logo.png" style="height: 1.5em;")
          span.ml-2.align-middle(style="font-size: 1.0em; color: #000;") ActivityWatch

      b-navbar-nav.ml-auto
        b-nav-item-dropdown
          template(slot="button-content")
            div.d-inline.px-2.px-lg-1
              icon(name="tools")
              | Tools
          b-dropdown-item(to="/search")
            icon(name="search")
            | Search
          b-dropdown-item(to="/trends" v-if="devmode")
            icon(name="chart-line")
            | Trends
          b-dropdown-item(to="/report" v-if="devmode")
            icon(name="chart-pie")
            | Report
          b-dropdown-item(to="/alerts" v-if="devmode")
            icon(name="flag-checkered")
            | Alerts
          b-dropdown-item(to="/timespiral" v-if="devmode")
            icon(name="history")
            | Timespiral
          b-dropdown-item(to="/query")
            icon(name="code")
            | Query
          b-dropdown-item(to="/graph" v-if="devmode")
            // TODO: use circle-nodes instead in the future
            icon(name="project-diagram")
            | Graph

        b-nav-item(to="/buckets")
          div.px-2.px-lg-1
            icon(name="database")
            | Raw Data
        b-nav-item(to="/settings")
          div.px-2.px-lg-1
            icon(name="cog")
            | Settings
</template>

<style lang="scss" scoped>
.fixed-top-padding {
  padding-bottom: 3.5em;
}
</style>

<script lang="ts">
// only import the icons you use to reduce bundle size
import 'vue-awesome/icons/calendar-day';
import 'vue-awesome/icons/calendar-week';
import 'vue-awesome/icons/stream';
import 'vue-awesome/icons/database';
import 'vue-awesome/icons/search';
import 'vue-awesome/icons/code';
import 'vue-awesome/icons/chart-line'; // TODO: switch to chart-column, when vue-awesome supports FA v6
import 'vue-awesome/icons/chart-pie';
import 'vue-awesome/icons/flag-checkered';
import 'vue-awesome/icons/stopwatch';
import 'vue-awesome/icons/cog';
import 'vue-awesome/icons/tools';
import 'vue-awesome/icons/history';

// TODO: use circle-nodes instead in the future
import 'vue-awesome/icons/project-diagram';
//import 'vue-awesome/icons/cicle-nodes';

import 'vue-awesome/icons/ellipsis-h';

import 'vue-awesome/icons/mobile';
import 'vue-awesome/icons/desktop';

import _ from 'lodash';

import { mapState } from 'pinia';
import { useSettingsStore } from '~/stores/settings';
import { useBucketsStore } from '~/stores/buckets';
import { IBucket } from '~/util/interfaces';

export default {
  name: 'Header',
  data() {
    return {
      activityViews: null,
      // Make configurable?
      // @ts-ignore - $isAndroid可能是通过Vue.prototype添加的全局属性
      fixedTopMenu: this.$isAndroid ?? false,
      isNavMenuOpen: false,
    };
  },
  computed: {
    ...mapState(useSettingsStore, ['devmode']),
  },
  mounted: async function () {
    const bucketStore = useBucketsStore();
    await bucketStore.ensureLoaded();
    const buckets: IBucket[] = bucketStore.buckets;
    const types_by_host = {};

    const activityViews = [];

    // TODO: Change to use same bucket detection logic as get_buckets/set_available in store/modules/activity.ts
    _.each(buckets, v => {
      types_by_host[v.hostname] = types_by_host[v.hostname] || {};
      types_by_host[v.hostname].afk ||= v.type == 'afkstatus';
      types_by_host[v.hostname].window ||= v.type == 'currentwindow';
      // TODO: Use other bucket type ID in the future
      types_by_host[v.hostname].android ||= v.type == 'currentwindow' && v.id.includes('android');
    });
    //console.log(types_by_host);

    _.each(types_by_host, (types, hostname) => {
      if (hostname != 'unknown') {
        activityViews.push({
          name: hostname,
          hostname: hostname,
          type: 'default',
          pathUrl: `/activity/${hostname}`,
          icon: 'desktop',
        });
      }
      if (types['android']) {
        activityViews.push({
          name: `${hostname} (Android)`,
          hostname: hostname,
          type: 'android',
          pathUrl: `/activity/${hostname}`,
          icon: 'mobile',
        });
      }
    });

    this.activityViews = activityViews;

    // 设置点击外部关闭导航栏功能
    console.group('[topmenu] 初始化导航栏点击外部关闭功能');
    
    // 延迟设置，确保DOM已完全渲染
    this.$nextTick(() => {
      console.log('[topmenu] DOM已更新，准备设置事件监听');
      
      // 检查导航栏组件是否存在
      if (!this.$refs.navbar) {
        console.error('[topmenu] 无法找到导航栏组件引用');
        return;
      }
      
      console.log('[topmenu] 导航栏组件:', this.$refs.navbar);
      
      // 获取实际的DOM元素
      const navbarEl = this.$refs.navbar.$el;
      if (!navbarEl) {
        console.error('[topmenu] 无法找到导航栏DOM元素');
        return;
      }
      
      console.log('[topmenu] 导航栏DOM元素:', navbarEl);
      
      // 获取折叠菜单元素和切换按钮
      const collapseEl = navbarEl.querySelector('#nav-collapse');
      const togglerEl = navbarEl.querySelector('.navbar-toggler');
      
      console.log('[topmenu] 折叠菜单元素:', collapseEl);
      console.log('[topmenu] 切换按钮元素:', togglerEl);
      
      // 使用MutationObserver监视折叠菜单的class变化
      if (collapseEl) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
              const isExpanded = collapseEl.classList.contains('show');
              console.log(`[topmenu] 导航菜单状态变化: ${isExpanded ? '已展开' : '已折叠'}`);
              this.isNavMenuOpen = isExpanded;
            }
          });
        });
        
        observer.observe(collapseEl, { attributes: true });
        console.log('[topmenu] 已设置折叠菜单状态监视器');
        
        // 保存observer引用以便后续清理
        this._navCollapseObserver = observer;
      }
      
      // 添加全局点击事件监听
      document.addEventListener('click', this.handleOutsideClick);
      console.log('[topmenu] 已添加全局点击事件监听');
    });
    
    console.groupEnd();
  },
  
  beforeDestroy() {
    console.log('[topmenu] 组件销毁，移除事件监听器');
    
    // 移除MutationObserver
    if (this._navCollapseObserver) {
      this._navCollapseObserver.disconnect();
      console.log('[topmenu] 已移除折叠菜单状态监视器');
    }
    
    // 移除点击事件监听器
    document.removeEventListener('click', this.handleOutsideClick);
    console.log('[topmenu] 已移除全局点击事件监听');
  },
  
  methods: {
    // 处理点击外部区域事件
    handleOutsideClick(event) {
      console.group('[topmenu] 处理点击事件');
      
      // 检查导航栏是否处于展开状态
      if (!this.isNavMenuOpen) {
        console.log('[topmenu] 导航栏未展开，无需处理');
        console.groupEnd();
        return;
      }
      
      console.log('[topmenu] 导航栏已展开，检查点击位置');
      
      // 获取导航栏和折叠菜单元素
      const navbar = this.$refs.navbar.$el;
      const navCollapse = navbar.querySelector('#nav-collapse');
      const togglerBtn = navbar.querySelector('.navbar-toggler');
      
      // 检查点击是否在切换按钮上
      if (togglerBtn && togglerBtn.contains(event.target)) {
        console.log('[topmenu] 点击在切换按钮上，无需额外处理');
        console.groupEnd();
        return;
      }
      
      // 检查点击是否在导航菜单外部
      if (navCollapse && !navCollapse.contains(event.target)) {
        console.log('[topmenu] 点击在导航菜单外部，准备关闭菜单');
        
        // 方法1: 使用Bootstrap-Vue API
        if (this.$refs.navbar && typeof this.$refs.navbar.toggle === 'function') {
          console.log('[topmenu] 使用Bootstrap-Vue API关闭菜单');
          this.$refs.navbar.toggle(false);
        }
        // 方法2: 直接点击切换按钮
        else if (togglerBtn) {
          console.log('[topmenu] 模拟点击切换按钮关闭菜单');
          togglerBtn.click();
        }
        // 方法3: 使用Bootstrap原生API (通过jQuery)
        else if ((window as any).jQuery && navCollapse) {
          console.log('[topmenu] 使用Bootstrap原生API关闭菜单');
          try {
            ((window as any).jQuery)(navCollapse).collapse('hide');
          } catch (err) {
            console.error('[topmenu] jQuery调用失败:', err);
          }
        }
        else {
          console.warn('[topmenu] 无法找到合适的方法关闭菜单');
        }
      } else {
        console.log('[topmenu] 点击在导航菜单内部，保持菜单打开');
      }
      
      console.groupEnd();
    },
    
    // 原有代码移除，改用MutationObserver实现
    // handleNavbarShown() {...},
    // handleNavbarHidden() {...},
  }
};
</script>

<style lang="scss" scoped>
@import '../style/globals';

.aw-navbar {
  background-color: white;
  border: solid $lightBorderColor;
  border-width: 0 0 1px 0;
}

.nav-item {
  align-items: center;

  margin-left: 0.2em;
  margin-right: 0.2em;
  border-radius: 0.5em;

  &:hover {
    background-color: #ddd;
  }
}

.abs-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
</style>

<style lang="scss">
// Needed because dropdown somehow doesn't properly work with scoping
.nav-item {
  .nav-link {
    color: #555 !important;
  }
}
</style>
