// pages/feedback/feedback.js - 意见反馈
const { submitFeedback } = require('../../services/feedback')

Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  async handleSubmit() {
    const { content, contact } = this.data

    if (!content || !content.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const res = await submitFeedback({ content: content.trim(), contact: contact.trim() || undefined })
      if (res) {
        wx.showToast({ title: '感谢你的反馈！', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: '提交失败，请重试', icon: 'none' })
      }
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '小学数学思维 - 每天10分钟，数学思维突飞猛进',
      path: '/pages/index/index'
    }
  }
})