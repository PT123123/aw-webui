import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5601',
  timeout: 5000
})

export default {
  async getNotes(limit = 50, offset = 0, tag = null) {
    try {
      const params = { limit, offset };
      if (tag) {
        params.tag = tag;
      }
      const fullUrl = `${api.defaults.baseURL}/inbox/notes?limit=${limit}&offset=${offset}${tag ? `&tag=${tag}` : ''}`;
      console.log('正在请求接口地址:', fullUrl);
      const response = await api.get('/inbox/notes', { params });
      console.log('请求成功，响应数据:', response.data);
      return response;
    } catch (error) {
      console.error(`请求失败 [${api.defaults.baseURL}/inbox/notes]:`, error.response?.data || error.message);
      throw error;
    }
  },

  async createNote(data) {
    try {
      const response = await api.post('/inbox/notes', data);
      return response;
    } catch (error) {
      console.error('创建笔记失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增更新方法
  async updateNote(id, data) {
    try {
      const response = await api.put(`/inbox/notes/${id}`, data);
      return response;
    } catch (error) {
      console.error('更新笔记失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增获取所有标签的方法
  async getAllTags() {
    try {
      const response = await api.get('/inbox/tags/all');
      return response;
    } catch (error) {
      console.error('获取所有标签失败:', error.response?.data || error.message);
      throw error;
    }
  }
}