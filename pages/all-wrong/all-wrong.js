// pages/all-wrong/all-wrong.js
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    wrongQuestions: [],
    filteredQuestions: [],
    filterType: 'all'
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      const wrongQuestions = await reviewService.getWrongQuestions() || []

      const processed = wrongQuestions.map(q => ({
        id: q.id,
        question_id: q.question_id,
        topicTitle: this.getTopicTitle(q.question_topic_id),
        content: q.question_content?.text || q.question_content || '',
        retry_count: q.retry_count || 0,
        created_at: q.created_at,
        dateLabel: this.getDateLabel(q.created_at)
      }))

      this.setData({
        loading: false,
        wrongQuestions: processed,
        filteredQuestions: processed
      })

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  getTopicTitle(topicId) {
    const titles = { 1: '算术', 2: '逻辑', 3: '几何', 4: '规律', 5: '综合' }
    return titles[topicId] || '其他'
  },

  getDateLabel(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth()+1}/${date.getDate()}`
  },

  setFilter(e) {
    const type = e.currentTarget.dataset.type
    const { wrongQuestions } = this.data

    let filtered = wrongQuestions
    if (type === 'recent') {
      // 最近7天的错题
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = wrongQuestions.filter(q => new Date(q.created_at) >= weekAgo)
    }

    this.setData({ filterType: type, filteredQuestions: filtered })
  },

  viewQuestion(e) {
    const question = e.currentTarget.dataset.question
    // 跳转到题目详情
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${question.question_id}`
    })
  },

  retryQuestion(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${id}`
    })
  }
})