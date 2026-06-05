// pages/topic-review/topic-review.js
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    topicId: 0,
    title: '',
    icon: '📝',
    iconClass: 'gray-bg',
    questions: [],
    wrongCount: 0
  },

  onLoad(options) {
    if (options.topic_id) {
      this.setData({
        topicId: parseInt(options.topic_id),
        title: decodeURIComponent(options.title || '专题复习')
      })
      this.setTopicIcon(parseInt(options.topic_id))
      this.loadData()
    }
  },

  setTopicIcon(topicId) {
    const icons = {
      1001: { icon: '🔢', iconClass: 'blue-bg' },
      1002: { icon: '🧩', iconClass: 'purple-bg' },
      1003: { icon: '📐', iconClass: 'green-bg' },
      1004: { icon: '🔍', iconClass: 'amber-bg' },
    }
    const iconData = icons[topicId] || { icon: '📝', iconClass: 'gray-bg' }
    this.setData({ icon: iconData.icon, iconClass: iconData.iconClass })
  },

  async loadData() {
    try {
      const wrongQuestions = await reviewService.getAllWrongQuestions() || []

      // 筛选该专题的错题
      const topicQuestions = wrongQuestions
        .filter(q => q.question_topic_id === this.data.topicId)
        .map(q => ({
          id: q.id,
          question_id: q.question_id,
          content: q.question_content?.text || '',
          retry_count: q.retry_count || 0,
          created_at: q.created_at,
          dateLabel: this.getDateLabel(q.created_at)
        }))

      this.setData({
        loading: false,
        questions: topicQuestions,
        wrongCount: topicQuestions.length
      })
    } catch (err) {
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  getDateLabel(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth()+1}/${date.getDate()}`
  },

  startReview() {
    if (this.data.questions.length === 0) {
      wx.showToast({ title: '没有错题', icon: 'none' })
      return
    }

    const ids = this.data.questions.map(q => q.question_id)
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${ids.join(',')}`
    })
  },

  viewQuestion(e) {
    const question = e.currentTarget.dataset.question
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${question.question_id}`
    })
  },

  retryQuestion(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${id}`
    })
  },

  async removeWrong(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await reviewService.removeWrongQuestion(questionId)
            wx.showToast({ title: '已移除', icon: 'success' })
            this.loadData()
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})