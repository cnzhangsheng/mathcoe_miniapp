// pages/content/content.js - 内容展示页
const { getContentDetail } = require('../../services/content')

Page({
  data: {
    loading: true,
    title: '',
    content: '',
    updatedAt: '',
  },

  onLoad(options) {
    const slug = options.slug
    if (slug) {
      this.loadContent(slug)
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: '参数错误', icon: 'none' })
    }
  },

  async loadContent(slug) {
    this.setData({ loading: true })
    try {
      const detail = await getContentDetail(slug)
      if (detail) {
        this.setData({
          loading: false,
          title: detail.title || '',
          content: detail.content || '',
          updatedAt: detail.updated_at ? detail.updated_at.slice(0, 10) : '',
        })
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('loadContent error:', err)
      this.setData({ loading: false })
    }
  },

})
