<template lang="pug">
div.aw-sync-page(:class="{ 'fixed-top-padding': true }")
  h1.sync-page-title 局域网同步
  small.text-muted v1.0.0
  p.text-muted 在本地网络内与其他设备同步 Inbox 与 ActivityWatch 数据。

  // ==================== 1. 配对与设备 ====================
  div.panel-header(@click="toggle('peers')")
    icon(:name="open.peers ? 'chevron-down' : 'chevron-right'")
    | 配对与设备
  b-collapse(v-model="open.peers")
    b-card
      div.mb-3.discovery-status(:class="status.discovery_running ? 'text-success' : 'text-warning'")
        b-badge(:variant="status.discovery_running ? 'success' : 'warning'").mr-2
          | {{ status.discovery_running ? '● 运行中' : '○ 未开启' }}
        | {{ status.discovery_running ? 'UDP 广播发现运行中，同网段设备将自动互相发现' : '局域网同步未开启 —— 请先在下方「设置」中打开开关并保存' }}
        span(v-if="status.discovery_running").ml-1 （UDP {{ status.udp_port }} / HTTP {{ status.listen_port }}）

      //- 本机地址：展示当前局域网 IP，便于对方在同网段发现/配对
      div.self-address.mb-2
        | 本机地址：
        span(v-if="!selfDevice || !selfDevice.ip || isLoopback(selfDevice.ip)").text-warning 未获取到局域网 IP（请检查 Wi-Fi 连接）
        span(v-else) {{ selfDevice.ip }}:{{ selfDevice.port }}
          span.text-info.ml-1 ({{ selfDevice.ip_iface || '未知网卡' }})
        span.text-muted.ml-1 (ID: {{ selfDevice && selfDevice.id ? selfDevice.id : '-' }})

      hr

      h5.discovered-title 已发现未配对的设备
      div(v-if="!discoveredDevices.length").text-muted 未发现设备 —— 确保双方已开启「局域网同步」并处于同一网络。
      div(v-for="d in discoveredDevices" :key="'disc-'+d.id").device-row.discovered
        div.device-info
          div.small-title {{ d.alias || d.name }}
          div.small-meta
            | {{ d.ip }}:{{ d.port }} · {{ deviceTypeLabel(d.device_kind) }}
            span.badge(:variant="isDeviceOnline(d) ? 'success' : 'secondary'") {{ isDeviceOnline(d) ? '在线' : '离线' }}
        div.device-actions
          b-button(
            v-if="d.incoming_pair_request"
            size="sm" variant="success"
            @click="acceptPair(d.id)"
          ) 接受配对
          b-button(
            v-else
            size="sm" variant="primary"
            @click="initiatePair(d.id)"
          ) 发起配对
      hr
      h5.paired-title 已配对设备
      div(v-if="!pairedDevices.length").text-muted 尚无已配对设备。
      div(v-for="d in pairedDevices" :key="d.id").paired-device-wrapper
        div.device-row.paired
          div.device-info
            div.small-title
              span(v-if="d.is_self") (本机)
              | {{ d.alias || d.name }}
            div.small-meta
              small.text-muted ID: {{ d.id }}
              | &nbsp;|&nbsp; {{ d.ip }}:{{ d.port }} · {{ deviceTypeLabel(d.device_kind) }}
              span.badge(:variant="isDeviceOnline(d) ? 'success' : 'secondary'") {{ isDeviceOnline(d) ? '在线' : '离线' }}
            div.small-meta(v-if="d.last_sync_at") 上次同步: {{ d.last_sync_at }}
            div.small-meta(v-if="renaming[d.id]")
              b-form-input(
                v-model="renameInputs[d.id]"
                size="sm"
                style="max-width: 160px"
                placeholder="新别名"
              )
              b-button(size="sm" variant="outline-success" @click="saveAlias(d)" :disabled="!renameInputs[d.id] || renameInputs[d.id] === (d.alias||d.name)") 确定
              b-button(size="sm" variant="outline-secondary" @click="renaming[d.id]=false") 取消
            div(v-else).small-meta
              b-button(size="sm" variant="outline-primary" @click="startRename(d)" :disabled="d.is_self") 重命名
          div.device-actions
            b-button(variant="outline-primary" size="sm" :disabled="d.is_self" @click="syncDevice(d.id)") 立即同步
            b-button(variant="outline-danger" size="sm" :disabled="d.is_self" @click="removeDevice(d.id)") 删除

        //- 同步摘要（始终显示）
        div.sync-summary(v-if="deviceStats[d.id] && !d.is_self")
          span.sync-stat 待同步: {{ deviceStats[d.id].pending_push_count }} 条
          span.sync-stat 冲突: {{ deviceStats[d.id].pending_conflict_count }} 条
          span.sync-stat 总同步: {{ deviceStats[d.id].total_synced_count }} 条
          span.sync-stat {{ humanSize(deviceStats[d.id].total_synced_size) }}
          b-button(
            size="sm"
            variant="outline-secondary"
            class="ml-auto"
            @click="toggleSyncDetails(d.id)"
          ) {{ expandedDevices[d.id] ? '收起详情' : '展开详情' }}

        //- 同步详情面板（点击展开）
        b-collapse(v-if="!d.is_self" v-model="expandedDevices[d.id]")
          div.sync-details(v-if="deviceStats[d.id]")
            //- 数据统计
            div.detail-section
              h6 数据统计
              ul
                li 本地数据: {{ deviceStats[d.id].local_note_count }} 条
                li 远端数据: {{ deviceStats[d.id].remote_note_count }} 条
                li 数据差异: {{ getDataDiffText(d.id) }}
            //- 时间信息
            div.detail-section
              h6 时间信息
              ul
                li 上次同步: {{ deviceStats[d.id].last_sync_at || '从未同步' }}
                li 上次全量同步: {{ deviceStats[d.id].last_full_sync_at || '从未全量同步' }}
                li 同步频率: {{ getSyncFrequencyText(d.id) }}
            //- 冲突列表
            div.detail-section(v-if="deviceConflicts[d.id] && deviceConflicts[d.id].length")
              h6 冲突列表 ({{ deviceConflicts[d.id].length }} 条)
              ul.conflict-list
                li(v-for="c in deviceConflicts[d.id]" :key="c.note_id")
                  span.conflict-status(:class="c.resolved ? 'resolved' : 'pending'")
                    | {{ c.resolved ? '[已解决]' : '[待解决]' }}
                  | {{ c.note_title }} - {{ formatTime(c.detected_at) }}
            //- 最近错误
            div.detail-section(v-if="deviceStats[d.id].last_error")
              h6 最近错误
              p.error-message {{ deviceStats[d.id].last_error }}
              small {{ formatTime(deviceStats[d.id].last_error_at) }}
            div.detail-section(v-else)
              h6 最近错误
              p.text-muted 无错误记录

  // ==================== 2. 设置 ====================
  div.panel-header(@click="toggle('settings')")
    icon(:name="open.settings ? 'chevron-down' : 'chevron-right'")
    | 设置
  b-collapse(v-model="open.settings")
    b-card(no-body)
      b-form
        b-form-group(label="局域网同步")
          b-form-checkbox(v-model="config.enabled" switch) 开启局域网同步
        b-form-group(label="HTTP 同步")
          b-form-checkbox(v-model="config.http_enabled" switch) 使用 HTTP 同步
        b-form-group(label="设备发现方式")
          b-form-select(v-model="config.discovery_method" :options="discoveryOptions")
          small.text-muted 已实现「广播 / mDNS+UDP」自动发现；「轮询遍历」功能待后续迭代。
        b-form-group(label="同步端口 (HTTP)")
          b-form-input(:value="config.listen_port" type="number" disabled)
          small.text-muted 设备间同步 HTTP 端口，与服务器端口一致（固定 5600）。
        b-form-group(label="UDP 发现端口")
          b-form-input(v-model.number="config.udp_port" type="number" min="10000" max="65535")
          small.text-muted 广播 / mDNS+UDP 自动发现固定端口（默认 46000）。
        b-form-group(label="在线探测间隔 (秒)")
          b-form-input(v-model.number="config.probe_interval" type="number" min="2" max="3600")
          small.text-muted 已配对设备定时间隔探测在线状态（默认 10s）。
        b-form-group(label="同步目标")
          b-form-checkbox(v-model="config.sync_inbox") Inbox 数据 (inbox.db)
          b-form-checkbox(v-model="config.sync_activity") ActivityWatch 数据 (sqlite.db)
        b-form-group(label="本机别名")
          b-form-input(
            v-model="config.self_alias"
            placeholder="设置本机别名（为空则使用主机名）"
            maxlength="20"
            style="max-width: 200px"
          )
          small.text-muted 广播时显示在对方设备列表中。
        b-button(variant="primary" @click="saveConfig") 保存同步设置

        hr
        b-form-group(label="配对数据")
          b-button(variant="outline-danger" @click="showClearModal = true") 清空所有配对信息
          small.text-muted.ml-2 移除全部已配对 / 已发现的设备（不可恢复）
        b-modal(
          v-model="showClearModal"
          title="清空所有配对信息"
          ok-variant="danger"
          ok-title="确定清空"
          cancel-title="取消"
          @ok="confirmClearAll"
        )
          p 确定要清空所有配对信息吗？
          p.text-danger 此操作将移除全部已配对与已发现的设备，且不可恢复。

  // ==================== 3. 显示报文 ====================
  div.panel-header(@click="toggle('logs')")
    icon(:name="open.logs ? 'chevron-down' : 'chevron-right'")
    | 显示报文
  b-collapse(v-model="open.logs")
    b-card
      b-form(inline)
        b-form-group(label="定时刷新(秒)")
          b-form-input(v-model.number="refreshInterval" type="number" min="1" style="width: 90px" @change="startAutoRefresh")
        b-form-group(label="显示条数")
          b-form-select(v-model.number="pageSize" :options="[5, 10, 50]" @change="loadLogs")
        b-form-group(label="来向/去向")
          b-form-select(v-model="filterDirection" :options="directionOptions" @change="loadLogs")
        b-form-group(label="报文阶段")
          b-form-select(v-model="filterEventType" :options="eventTypeOptions" @change="loadLogs")
        b-form-group(label="协议")
          b-form-select(v-model="filterProtocol" :options="protocolOptions" @change="loadLogs")
        b-button(variant="primary" @click="loadLogs") 刷新
        b-button(variant="outline-secondary" class="ml-2" @click="showClearLogModal = true") 清空日志
      div(v-if="logError").text-danger.mb-2 报文加载失败：{{ logError }}
      div.table-responsive
        table.table.table-sm.sync-log-table
          thead
            tr
              th 时间
              th 方向
              th 协议
              th 对端
              th 阶段
              th 状态
              th 消息
              th 大小
          tbody
            tr(v-for="(log, i) in logs" :key="i")
              td {{ formatTime(log.timestamp) }}
              td {{ directionLabel(log.direction) }}
              td {{ protocolLabel(log.protocol) }}
              td {{ log.peer_id || '-' }}
              td {{ eventLabel(log.event_type) }}
              td: span.badge(:variant="log.status === 'success' ? 'success' : (log.status === 'failed' ? 'danger' : 'secondary')") {{ log.status }}
              td {{ log.message || '-' }}
              td {{ humanSize(log.data_size) }}
          tbody(v-if="!logs.length && !logError")
            tr
              td(colspan="8").text-center.py-3
                span.text-warning(v-if="!status.discovery_running") 局域网同步未开启 — 请在上方「设置」中开启并保存后，广播报文将在此显示
                span.text-muted(v-else) 暂无报文记录（发现、配对、同步完成后会在这里显示）
  //- 清空报文日志确认弹窗
  b-modal(
    v-model="showClearLogModal"
    title="清空报文日志"
    ok-variant="danger"
    ok-title="确定清空"
    cancel-title="取消"
    @ok="confirmClearLogs"
  )
    p 确定要清空所有报文日志吗？
    p.text-danger 此操作仅清除「显示报文」里的调试记录，不影响设备与配对信息。
</template>

<script>
import syncApi from '../api/sync.js'
import 'vue-awesome/icons/sync'
import 'vue-awesome/icons/chevron-down'
import 'vue-awesome/icons/chevron-right'

export default {
  name: 'Sync',
  data() {
    return {
      open: { settings: false, peers: true, logs: false },
      config: {
        enabled: false,
        http_enabled: true,
        discovery_method: 'broadcast',
        listen_port: 56001,
        udp_port: 46000,
        sync_inbox: true,
        sync_activity: true,
        self_alias: '',
        probe_interval: 10
      },
      discoveryOptions: [
        { value: 'broadcast', text: '广播 / mDNS + UDP（已实现）' },
        { value: 'poll', text: '轮询遍历（待实现）' }
      ],
      directionOptions: [
        { value: '', text: '全部' },
        { value: 'out', text: '去向（发出）' },
        { value: 'in', text: '来向（接收）' }
      ],
      eventTypeOptions: [
        { value: '', text: '全部' },
        { value: 'discovery', text: '发现' },
        { value: 'pairing', text: '配对' },
        { value: 'sync', text: '同步' },
        { value: 'conflict', text: '冲突' }
      ],
      protocolOptions: [
        { value: '', text: '全部' },
        { value: 'http', text: 'HTTP' },
        { value: 'udp_broadcast', text: 'UDP 广播' },
        { value: 'mdns', text: 'mDNS' }
      ],
            devices: [],
      status: { enabled: false, discovery_running: false, udp_port: 46000, listen_port: 56001 },
      selfDevice: {},
      renameInputs: {},
      renaming: {},
      logs: [],
      logError: '',
      filterDirection: '',
      filterProtocol: '',
      filterEventType: '',
      pageSize: 10,
      refreshInterval: 5,
      pollSeq: 0,
      _timer: null,
      _logTimer: null,
      deviceStats: {},
      deviceConflicts: {},
      expandedDevices: {},
      showClearModal: false,
      showClearLogModal: false
    }
  },
  computed: {
    discoveredDevices() {
      return (this.devices || []).filter((d) => !d.is_self && !d.paired && this.isDeviceOnline(d))
    },
    pairedDevices() {
      return (this.devices || []).filter((d) => d.paired)
    },
    isDeviceOnline() {
      return (d) => {
        if (!d) return false
        // Paired devices: trust is_online (updated by probe)
        if (d.paired) return d.is_online
        // Discovered (unpaired) devices: check last_seen_at within 30 seconds
        if (d.last_seen_at) {
          const lastSeen = new Date(d.last_seen_at).getTime()
          return Date.now() - lastSeen < 30000
        }
        return false
      }
    }
  },
  mounted() {
    console.log('[aw-sync] ===== Sync 组件已挂载, 版本标记=v3-debug =====')
    this.load()
    this.startLogPolling()
  },
  beforeDestroy() {
    if (this._timer) clearInterval(this._timer)
    if (this._logTimer) clearInterval(this._logTimer)
  },
  methods: {
    toggle(key) {
      this.open[key] = !this.open[key]
    },
    async load() {
      await this.loadConfig()
      await this.loadDevices()
      await this.loadLogs()
      await this.loadStatus()
      this.startAutoRefresh()
    },
    async loadStatus() {
      try {
        this.status = await syncApi.getStatus()
        console.log('[aw-sync] loadStatus:', this.status)
      } catch (e) { console.error('[aw-sync] loadStatus 失败:', e) }
    },
    async loadConfig() {
      try {
        this.config = await syncApi.getConfig()
        console.log('[aw-sync] loadConfig:', this.config)
      } catch (e) { console.error('[aw-sync] loadConfig 失败:', e) }
    },
    async saveConfig() {
      try {
        const saved = await syncApi.saveConfig(this.config)
        if (saved && saved.enabled) {
          alert('同步设置已保存：局域网同步已开启，UDP 广播发现已启动（同网段设备将自动互相发现）')
        } else {
          alert('同步设置已保存（局域网同步处于关闭状态）')
        }
        await this.loadStatus()
      } catch (e) { alert('保存失败: ' + (e.message || e)) }
    },
    async loadDevices() {
      try {
        this.devices = await syncApi.getDevices()
        console.log('[aw-sync] loadDevices 设备数:', this.devices.length, this.devices)
        const found = this.devices.find((d) => d.is_self)
        if (found) { this.selfDevice = found } else { this.selfDevice = await syncApi.getInfo() }
        // Load stats for paired devices
        await this.loadAllDeviceStats()
      } catch (e) { console.error('[aw-sync] loadDevices 失败:', e) }
    },
    async loadAllDeviceStats() {
      const paired = this.devices.filter(d => d.paired && !d.is_self)
      for (const d of paired) {
        await this.loadDeviceStats(d.id)
      }
    },
    async loadDeviceStats(deviceId) {
      try {
        const stats = await syncApi.getDeviceStats(deviceId)
        this.$set(this.deviceStats, deviceId, stats)
        const conflicts = await syncApi.getDeviceConflicts(deviceId)
        this.$set(this.deviceConflicts, deviceId, conflicts.conflicts || [])
      } catch (e) {
        console.error('[aw-sync] loadDeviceStats 失败:', deviceId, e)
      }
    },
    toggleSyncDetails(deviceId) {
      this.$set(this.expandedDevices, deviceId, !this.expandedDevices[deviceId])
    },
    // 清空所有配对/已发现设备（保留本机记录与同步设置），带确认弹窗
    async confirmClearAll() {
      try {
        const r = await syncApi.clearAllDevices()
        alert('已清空所有配对信息，共移除 ' + (r && r.cleared != null ? r.cleared : 0) + ' 台设备')
        await this.loadDevices()
        this.loadLogs()
      } catch (e) {
        alert('清空失败：' + (e.message || e))
      }
    },
    // 清空「显示报文」里的全部同步日志（保留设备与设置），带确认弹窗
    async confirmClearLogs() {
      try {
        await syncApi.clearLogs()
        await this.loadLogs()
      } catch (e) {
        alert('清空日志失败：' + (e.message || e))
      }
    },
    // 判断是否为回环/无效地址（127.x、localhost、空）
    isLoopback(ip) {
      if (!ip) return true
      if (ip === 'localhost' || ip === '0.0.0.0' || ip === '::1') return true
      return ip.startsWith('127.')
    },
    getDataDiffText(deviceId) {
      const s = this.deviceStats[deviceId]
      if (!s) return '-'
      const diff = s.local_note_count - s.remote_note_count
      if (diff > 0) return `本地多 ${diff} 条`
      if (diff < 0) return `远端多 ${Math.abs(diff)} 条`
      return '数据一致'
    },
    getSyncFrequencyText(deviceId) {
      const s = this.deviceStats[deviceId]
      if (!s || !s.sync_frequency_minutes) return '尚未同步'
      const mins = s.sync_frequency_minutes
      if (mins < 60) return `平均每 ${mins} 分钟`
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      if (hours < 24) return `平均每 ${hours} 小时 ${remainMins} 分钟`
      const days = Math.floor(hours / 24)
      return `平均每 ${days} 天 ${hours % 24} 小时`
    },
    async syncDevice(id) {
      try { const r = await syncApi.syncDevice(id); alert('同步完成，应用记录数 ' + r.applied) }
      catch (e) { alert('同步失败：' + (e.message || e)) }
      this.loadLogs()
    },
        async removeDevice(id) {
      if (!confirm('确定删除该设备？')) return
      await syncApi.removeDevice(id)
      await this.loadDevices()
    },
    startRename(d) {
      this.renaming[d.id] = true
      this.renameInputs[d.id] = d.alias || d.name || ''
    },
    async saveAlias(d) {
      const newAlias = String(this.renameInputs[d.id] || '').trim()
      if (!newAlias || newAlias === (d.alias || d.name)) {
        this.renaming[d.id] = false
        return
      }
      try {
        await syncApi.updateDeviceAlias(d.id, newAlias)
        this.renaming[d.id] = false
        await this.loadDevices()
      } catch (e) {
        alert('修改别名失败：' + ((e.message) || e))
      }
    },
    // 发起配对：本机向目标设备发出配对请求，等待对方接受
    async initiatePair(id) {
      console.log('[aw-sync] initiatePair 目标设备:', id)
      try {
        const result = await syncApi.initiatePair(id)
        console.log('[aw-sync] initiatePair 成功:', result)
        await this.loadDevices()
        // Reset filter controls to ensure new log is visible
        this.filterDirection = ''
        this.filterEventType = ''
        this.filterProtocol = ''
        this.pageSize = 10
        this.refreshInterval = 5
        await this.loadLogs() // Refresh logs with cleared filters
      } catch (e) {
        console.error('[aw-sync] initiatePair 失败:', e)
        // Still refresh logs to show the pairing attempt log
        await this.loadLogs()
      }
    },
    // 接受配对：对方发起的配对请求，本机点击接受
    async acceptPair(id) {
      console.log('[aw-sync] acceptPair 设备:', id)
      try {
        const result = await syncApi.acceptPair(id)
        console.log('[aw-sync] acceptPair 成功:', result)
        await this.loadDevices()
        // Reset filter controls to ensure new log is visible
        this.filterDirection = ''
        this.filterEventType = ''
        this.filterProtocol = ''
        this.pageSize = 10
        this.refreshInterval = 5
        await this.loadLogs() // Refresh logs with cleared filters
      } catch (e) {
        console.error('[aw-sync] acceptPair 失败:', e)
        await this.loadLogs()
      }
    },
// 新增的加载日志方法
    async loadLogs() {
      console.log('[aw-sync] >>>>>> loadLogs 被调用 <<<<<')
      try {
        const params = {
          direction: this.filterDirection || undefined,
          eventType: this.filterEventType || undefined,
          protocol: this.filterProtocol || undefined,
          limit: this.pageSize
        }
        console.log('[aw-sync] loadLogs 请求参数:', JSON.stringify(params))
        const r = await syncApi.getLogs(params)
        console.log('[aw-sync] loadLogs 原始响应类型:', typeof r, '值:', JSON.stringify(r))
        if (r === undefined || r === null) {
          console.error('[aw-sync] loadLogs 响应为空! r =', r)
          this.logs = []
          this.logError = '服务端返回空响应'
        } else if (r.logs !== undefined) {
          this.logs = r.logs || []
          this.logError = ''
          console.log('[aw-sync] loadLogs 成功，报文数:', this.logs.length, 'total:', r.total)
        } else {
          console.error('[aw-sync] loadLogs 响应中没有 logs 字段! keys:', Object.keys(r), '值:', JSON.stringify(r))
          this.logs = []
          this.logError = '响应格式异常: ' + JSON.stringify(r).substring(0, 200)
        }
      } catch (e) {
        console.error('[aw-sync] loadLogs 异常:', e)
        console.error('[aw-sync] loadLogs 异常类型:', typeof e)
        console.error('[aw-sync] loadLogs 异常message:', e.message)
        console.error('[aw-sync] loadLogs 异常response:', e.response)
        if (e.response) {
          console.error('[aw-sync] loadLogs HTTP状态:', e.response.status)
          console.error('[aw-sync] loadLogs 响应体:', JSON.stringify(e.response.data).substring(0, 500))
        }
        const msg = ((e.response && e.response.data && e.response.data.error) || e.message || String(e))
        this.logError = msg
      }
    },
    startAutoRefresh() {
      if (this._timer) clearInterval(this._timer)
      this._timer = setInterval(() => {
        this.loadDevices()
        this.loadLogs()
        this.loadStatus()
      }, this.refreshInterval * 1000)
    },
      // 把 Rust 侧同步日志增量拉到浏览器控制台（F12 可见），离开页面自动停止
    startLogPolling() {
      // eslint-disable-next-line no-console
      console.log('[aw-sync] 调试日志通道已开启，每 2s 轮询 /api/0/sync/debuglog …')
      this.pollLogs() // 先拉一次历史
      this._logTimer = setInterval(() => this.pollLogs(), 2000)
    },
    async pollLogs() {
      try {
        const entries = await syncApi.getDebugLog(this.pollSeq)
        if (!Array.isArray(entries) || !entries.length) return
        for (const e of entries) {
          // eslint-disable-next-line no-console
          console.log(`[aw-sync][${e.level}] ${e.ts} ${e.msg}`)
        }
        this.pollSeq = entries[entries.length - 1].seq
      } catch (e) {
        // 调试通道失败不影响功能，但要留痕便于排查（如旧 .so 无此路由时返回 404）
        if (!this._logWarned) {
          this._logWarned = true
          // eslint-disable-next-line no-console
          console.warn('[aw-sync] 调试日志拉取失败（若持续出现，说明 APK 内嵌的 webui/so 不是同一批构建）:', e && e.message)
        }
      }
    },
    deviceTypeLabel(t) {
      return ({ windows: 'Windows', android: 'Android', ios: 'iOS', linux: 'Linux', macos: 'macOS' })[t] || t || '-'
    },
    directionLabel(d) { return d === 'out' ? '去向' : '来向' },
    eventLabel(e) { return ({ discovery: '发现', pairing: '配对', sync: '同步', conflict: '冲突' })[e] || e || '-' },
    protocolLabel(p) { return ({ http: 'HTTP', udp_broadcast: 'UDP 广播', mdns: 'mDNS' })[p] || p || '-' },
    formatTime(ts) {
      if (!ts) return '-'
      try {
        const d = new Date(ts)
        if (isNaN(d.getTime())) return ts
        return d.toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch (e) { return ts }
    },
    humanSize(n) {
      if (!n) return '-'
      if (n < 1024) return n + ' B'
      return (n / 1024).toFixed(1) + ' KB'
    }
  }
}
</script>

<style lang="scss" scoped>
// 整个同步页面强制黑底白字，不随亮/暗主题切换
.aw-sync-page {
  background-color: #1a1d24 !important;
  color: #ffffff !important;

  // 继承到所有子元素，确保小项也为白字黑底
  * {
    background-color: transparent !important;
    color: inherit !important;
  }

  // 卡片
  .b-card,
  .card {
    background-color: #24272e !important;
    color: #ffffff !important;
  }

  // 表单标签
  label,
  .b-form-group-label,
  .form-label {
    color: #ffffff !important;
  }

  // 输入框
  .b-form-input,
  input[type="text"],
  input[type="number"],
  input[type="password"],
  textarea {
    background-color: #2c3138 !important;
    color: #ffffff !important;
    border-color: rgba(127, 127, 127, 0.4) !important;
  }

  // 下拉框
  .b-form-select,
  select {
    background-color: #2c3138 !important;
    color: #ffffff !important;
    border-color: rgba(127, 127, 127, 0.4) !important;
  }

  // 复选框/开关
  .b-form-checkbox,
  .custom-control-label {
    color: #ffffff !important;
  }
  .b-form-checkbox-label,
  .custom-control-label::before,
  .custom-control-label::after {
    color: #ffffff !important;
  }

  // badge
  .badge {
    color: #ffffff !important;
  }

  // 链接
  a {
    color: #4a9eff !important;
  }

  // hr
  hr {
    border-color: rgba(127, 127, 127, 0.4) !important;
  }

  // table
  table {
    color: #ffffff !important;
    th,
    td {
      border-color: rgba(127, 127, 127, 0.4) !important;
      white-space: pre-line;
    }
    thead th {
      background-color: #2c3138 !important;
      color: #ffffff !important;
    }
    tbody tr:nth-of-type(odd) {
      background-color: rgba(127, 127, 127, 0.08) !important;
    }
  }

  // 按钮
  .b-btn {
    color: #ffffff !important;
  }
}

// page title
.sync-page-title {
  display: inline-block;
  background-color: #1a1d24;
  color: #ffffff !important;
  border: 1px solid #282c32;
  border-radius: 0.5rem;
  padding: 0.35rem 0.9rem;
}

.panel-header {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  // 大项标题：黑底白字（不随主题切换）
  background-color: #1a1d24;
  color: #ffffff !important;
  border: 1px solid #282c32;
  border-radius: 0.4rem;
  padding: 0.4rem 0.6rem;
  margin: 1rem 0 0.5rem;

  .fa-icon {
    transition: transform 0.15s ease;
  }

  &:hover {
    background-color: rgba(127, 127, 127, 0.2);
  }
}

.discovered-title,
.paired-title {
  color: #ffffff !important;
  margin-bottom: 0.5rem;
}

.device-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(127, 127, 127, 0.3);
}

.paired-device-wrapper {
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(127, 127, 127, 0.2);
}

.small-title {
  font-weight: 600;
}

.small-meta {
  opacity: 0.75;
  font-size: 0.85rem;
  margin-top: 0.1rem;
}

.badge {
  margin-left: 0.3rem;
}

.badge-online {
  background-color: rgba(40, 167, 129, 0.2) !important;
}

// 同步日志表：自绘边框与斑马纹，不依赖 dark.css 的选择器命中，亮/暗主题都可读
.sync-log-table {
  width: 100%;

  th,
  td {
    border-color: rgba(127, 127, 127, 0.35);
    white-space: nowrap;
  }

  thead th {
    border-bottom-width: 2px;
  }

  tbody tr:nth-of-type(odd) {
    background-color: rgba(127, 127, 127, 0.08);
  }
}

.text-muted {
  opacity: 0.6 !important;
}

// 同步摘要（始终显示）
.sync-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(127, 127, 127, 0.3);
  margin-top: 0.5rem;
}

.sync-stat {
  font-size: 0.85rem;
  opacity: 0.8;
}

// 同步详情面板
.sync-details {
  padding: 1rem;
  background-color: rgba(127, 127, 127, 0.05);
  border-radius: 0.4rem;
  margin-top: 0.5rem;
  border: 1px solid rgba(127, 127, 127, 0.2);
}

.detail-section {
  margin-bottom: 1rem;

  h6 {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #ffffff;
  }

  ul {
    list-style: none;
    padding-left: 0;

    li {
      font-size: 0.85rem;
      padding: 0.2rem 0;
      opacity: 0.9;
    }
  }
}

// 冲突列表
.conflict-list {
  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.conflict-status {
  font-size: 0.75rem;
  padding: 0.1rem 0.3rem;
  border-radius: 0.2rem;

  &.pending {
    background-color: rgba(255, 193, 7, 0.2);
    color: #ffc107;
  }

  &.resolved {
    background-color: rgba(40, 167, 129, 0.2);
    color: #28a745;
  }
}

.error-message {
  color: #dc3545;
  font-size: 0.85rem;
}
</style>