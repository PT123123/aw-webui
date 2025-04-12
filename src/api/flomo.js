import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5601',  // 基础路径不带/api
  timeout: 5000
})

export default {
  async getNotes() {
    try {
        // 拼接完整请求路径
        const fullUrl = api.defaults.baseURL + '/flomo/notes';
        console.log('正在请求接口地址:', fullUrl);  // 新增日志
        const response = await api.get('/flomo/notes')
        console.log('请求成功，响应数据:', response.data);  // 新增日志
        return response
    } catch (error) {
        // 带完整路径的错误日志
        console.error(`请求失败 [${api.defaults.baseURL}/flomo/notes]:`, error.response?.data || error.message)
        throw error
    }
},
  async createNote(data) {
    try {
      const response = await api.post('/flomo/notes', data)  // 保持路径一致
      return response
    } catch (error) {
      console.error('创建笔记失败:', error.response?.data || error.message)
      throw error
    }
  }
}