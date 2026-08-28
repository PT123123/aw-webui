import axios from 'axios'

// 同步服务 API（与 aw-server 同源，Rocket 挂载于 /api/0/sync）
const api = axios.create({
  timeout: 10000
})

export default {
  // ---- 设置 ----
  async getConfig() {
    const r = await api.get('/api/0/sync/config')
    return r.data
  },
  async saveConfig(cfg) {
    const r = await api.put('/api/0/sync/config', cfg)
    return r.data
  },
  async getInfo() {
    const r = await api.get('/api/0/sync/info')
    return r.data
  },
  // ---- 配对（已发现设备发起/接受） ----
  // 发起配对：本机请求与某已发现设备配对
  async initiatePair(deviceId) {
    const r = await api.post('/api/0/sync/pair/initiate', { device_id: deviceId })
    return r.data
  },
  // 接受配对：本机确认接受某设备的配对请求
  async acceptPair(deviceId) {
    const r = await api.post('/api/0/sync/pair/accept', { device_id: deviceId })
    return r.data
  },
  // ---- 设备 ----
  async getDevices() {
    const r = await api.get('/api/0/sync/devices')
    return r.data
  },
  async syncDevice(id) {
    const r = await api.post(`/api/0/sync/devices/${id}/sync`)
    return r.data
  },
  async addDevice(device) {
    const r = await api.post('/api/0/sync/devices', device)
    return r.data
  },
    async removeDevice(id) {
    const r = await api.delete(`/api/0/sync/devices/${id}`)
    return r.data
  },
  // 清空所有配对/已发现设备（保留本机记录与同步设置）
  async clearAllDevices() {
    const r = await api.delete('/api/0/sync/devices/all')
    return r.data
  },
  async updateDeviceAlias(id, alias) {
    const r = await api.put(`/api/0/sync/devices/${id}/alias`, { alias: alias || null })
    return r.data
  },
  // ---- 同步日志 ----
  // 发现状态（广播是否运行、端口等）
  async getStatus() {
    const r = await api.get('/api/0/sync/status')
    return r.data
  },
  // Rust 侧调试日志（环形缓冲），after 为上次收到的最大 seq
  async getDebugLog(after = 0) {
    const r = await api.get('/api/0/sync/debuglog', { params: { after } })
    return r.data
  },
  // 清空全部同步报文日志（保留设备与设置）
  async clearLogs() {
    const r = await api.delete('/api/0/sync/log')
    return r.data
  },
  async getLogs(params = {}) {
    const { direction, protocol, eventType, limit = 50, offset = 0 } = params
    console.log('[aw-sync-api] >>>>>> getLogs 被调用, baseURL=' + api.defaults.baseURL + ' <<<<<')
    console.log('[aw-sync-api] getLogs 请求参数:', JSON.stringify({ direction, protocol, eventType, limit, offset }))
    try {
      const r = await api.get('/api/0/sync/log', {
        params: { direction, protocol, event_type: eventType, limit, offset }
      })
      console.log('[aw-sync-api] getLogs HTTP状态:', r.status)
      console.log('[aw-sync-api] getLogs 响应类型:', typeof r.data, '值:', JSON.stringify(r.data).substring(0, 500))
      return r.data
    } catch (err) {
      console.error('[aw-sync-api] getLogs 请求失败:', err.message)
      if (err.response) {
        console.error('[aw-sync-api] getLogs HTTP状态:', err.response.status)
        console.error('[aw-sync-api] getLogs 响应体:', JSON.stringify(err.response.data).substring(0, 500))
      } else {
        console.error('[aw-sync-api] getLogs 网络错误/无响应:', err.code || err.message)
      }
      throw err
    }
  },
  // ---- 设备同步统计 ----
  async getDeviceStats(deviceId) {
    const r = await api.get(`/api/0/sync/devices/${deviceId}/stats`)
    return r.data
  },
  async getDeviceConflicts(deviceId) {
    const r = await api.get(`/api/0/sync/devices/${deviceId}/conflicts`)
    return r.data
  }
}