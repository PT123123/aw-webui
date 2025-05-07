import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5600',
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
  async deleteNote(noteId) {
      try {
        const response = await fetch(`/inbox/notes/${noteId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log(`Note with id ${noteId} deleted successfully.`);
          // 在前端更新笔记列表
          this.loadNotes(true); // 调用 loadNotes 重新加载数据
        } else if (response.status === 404) {
          console.error(`Note with id ${noteId} not found.`);
        } else {
          console.error('Failed to delete note:', response.status);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
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