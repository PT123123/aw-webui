import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5600',
  timeout: 5000
})

export default {
  async getNotes(params = {}) {
    try {
      // 确保 params 是一个对象
      const queryParams = typeof params === 'object' ? params : { limit: params };
      
      // 构建查询参数
      const { limit = 50, offset = 0, tag, tags, search, sort_by } = queryParams;
      
      // 构建参数对象
      const requestParams = { limit, offset };
      
      // 添加可选参数
      if (tag) requestParams.tag = tag;
      if (tags) requestParams.tag = Array.isArray(tags) ? tags.join(',') : tags;
      if (search) requestParams.search = search;
      if (sort_by) requestParams.sort_by = sort_by;
      
      // 记录完整的请求 URL
      const queryString = new URLSearchParams(requestParams).toString();
      const fullUrl = `${api.defaults.baseURL}/inbox/notes?${queryString}`;
      console.log('正在请求接口地址:', fullUrl);
      
      // 发送 GET 请求
      const response = await api.get('/inbox/notes', { params: requestParams });
      console.log('请求成功，原始响应数据:', response.data);
      
      // 确保以规范格式返回数据
      let standardizedResponse;
      if (Array.isArray(response.data)) {
        // 如果后端返回数组，则包装为标准对象格式
        standardizedResponse = {
          notes: response.data,
          offset: offset + response.data.length,
          has_more: response.data.length === limit
        };
      } else if (response.data && typeof response.data === 'object') {
        // 如果后端返回对象，确保它有必要的属性
        standardizedResponse = {
          notes: response.data.notes || response.data,
          offset: response.data.offset || (offset + (response.data.notes?.length || 0)),
          has_more: response.data.has_more !== undefined 
            ? response.data.has_more 
            : ((response.data.notes?.length || 0) === limit)
        };
      } else {
        // 未预料的响应格式
        standardizedResponse = {
          notes: [],
          offset: offset,
          has_more: false
        };
        console.warn('意外的响应格式:', response.data);
      }
      
      console.log('标准化后的响应数据:', standardizedResponse);
      return standardizedResponse;
    } catch (error) {
      console.error(`请求失败 [${api.defaults.baseURL}/inbox/notes]:`, error.response?.data || error.message);
      throw error;
    }
  },
  async deleteNote(noteId) {
    try {
      const response = await fetch(`/inbox/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`Note with id ${noteId} deleted successfully.`);
        return true; // 返回成功状态
      } else if (response.status === 404) {
        console.error(`Note with id ${noteId} not found.`);
        return false; // 返回失败状态
      } else {
        console.error('Failed to delete note:', response.status);
        return false; // 返回失败状态
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      return false; // 发生异常时返回失败状态
    }
  },


  async createNote(data) {
    try {
      // 直接传递数据，因为现在都是纯文本
      console.log('创建笔记，发送数据:', data);
      const response = await axios.post('/inbox/notes', data);
      return response;
    } catch (error) {
      console.error('创建笔记失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增更新方法
  async updateNote(id, data) {
    try {
      // 直接传递数据，因为现在都是纯文本
      console.log('更新笔记，发送数据:', data);
      const response = await axios.put(`/inbox/notes/${id}`, data);
      return response;
    } catch (error) {
      console.error('更新笔记失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增获取所有标签的方法
  async getAllTags() {
    try {
      const response = await api.get('/inbox/tags');
      return response.data;
    } catch (error) {
      console.error('获取所有标签失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增获取详细标签信息的方法（包含数量和最近修改时间）
  async getDetailedTags() {
    try {
      const response = await api.get('/inbox/tags/detailed');
      return response.data;
    } catch (error) {
      console.error('获取详细标签信息失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 新增获取特定笔记评论的方法
  async getCommentsForNote(noteId) {
    try {
      const response = await api.get(`/inbox/notes/${noteId}/comments`);
      return response;
    } catch (error) {
      console.error(`获取笔记 ${noteId} 的评论失败:`, error.response?.data || error.message);
      throw error;
    }
  },

  // 新增添加评论的方法
  async addCommentToNote(noteId, commentData) {
    try {
      const response = await api.post(`/inbox/notes/${noteId}/comments`, commentData);
      return response;
    } catch (error) {
      console.error(`添加评论到笔记 ${noteId} 失败:`, error.response?.data || error.message);
      throw error;
    }
  },
}