// pages/wrong-explanation/wrong-explanation.js - 错题解析页面
const { processRichText } = require('../../utils/util')
const { formatDifficulty, IMAGE_BASE_URL } = require('../../utils/constants')
const { getTopicClass } = require('../../services/topics')
const reviewService = require('../../services/review')

Page({
  data: {
    questionId: 0,
    wrongId: 0,
    topicTitle: '',
    dateLabel: '',
    content: '',
    options: [],
    correctAnswer: '',
    userAnswer: '',
    isCorrect: false,
    explanation: '',
    isLoggedIn: false,
    isFavorited: false,
    imageBaseUrl: IMAGE_BASE_URL,
  },

  getTopicClass(topicId) { return getTopicClass(topicId) },

  onLoad(options) {
    const token = wx.getStorageSync('token')
    const question = JSON.parse(decodeURIComponent(options.question || '{}'))

    // 转换 options 格式: [{label: 'A', text: '内容'}] -> [{key: 'A', value: '内容'}]
    const optionsList = (question.options || []).map(opt => ({
      key: opt.label || opt.key,
      value: processRichText(opt.text || opt.value || opt.content?.text || '')
    }))

    this.setData({
      questionId: question.question_id,
      wrongId: question.id,
      topicTitle: question.topicTitle || '',
      topicClass: this.getTopicClass(question.topic_id),
      dateLabel: question.dateLabel || '',
      content: processRichText(question.content || ''),
      options: optionsList,
      correctAnswer: question.answer || '',
      userAnswer: question.user_answer || '',
      isCorrect: question.user_answer === question.answer,
      explanation: processRichText(question.explanation || ''),
      questionLevel: question.level ? formatDifficulty(question.level) : '',
      isLoggedIn: !!token,
    })

    // 检查收藏状态
    if (token && question.question_id) {
      this.checkFavoriteStatus(question.question_id)
    }
  },

  // 检查收藏状态
  async checkFavoriteStatus(questionId) {
    try {
      const result = await reviewService.isFavorited(questionId)
      this.setData({ isFavorited: !!result })
    } catch (err) {
      console.error('checkFavoriteStatus error:', err)
    }
  },

  // 收藏/取消收藏
  async toggleFavorite() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login?redirect=topics' })
      return
    }
    try {
      if (this.data.isFavorited) {
        const result = await reviewService.removeFavorite(this.data.questionId)
        if (result) {
          this.setData({ isFavorited: false })
          wx.showToast({ title: '已取消收藏', icon: 'success' })
        }
      } else {
        const result = await reviewService.addFavorite(this.data.questionId)
        if (result) {
          this.setData({ isFavorited: true })
          wx.showToast({ title: '已收藏', icon: 'success' })
        }
      }
    } catch (err) {
      console.error('toggleFavorite error:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 重练此题
  retryQuestion() {
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${this.data.questionId}`
    })
  },

  // 移除错题
  removeQuestion() {
    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeWrongQuestion(this.data.questionId)
            if (result) {
              wx.showToast({ title: '已移除', icon: 'success' })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            } else {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  onShareAppMessage() {
    const q = this.data
    return {
      title: `【数学练习】${q.topicTitle || '错题'} - 袋鼠数学助理`,
      path: `/pages/discover/discover?question_id=${q.questionId}`
    }
  }
})