// pages/wrong-explanation/wrong-explanation.js - 错题解析页面
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
    explanation: ''
  },

  onLoad(options) {
    const question = JSON.parse(decodeURIComponent(options.question || '{}'))
    this.setData({
      questionId: question.question_id,
      wrongId: question.id,
      topicTitle: question.topicTitle || '',
      dateLabel: question.dateLabel || '',
      content: question.content || '',
      options: question.options || [],
      correctAnswer: question.answer || '',
      userAnswer: question.user_answer || '',
      isCorrect: question.user_answer === question.answer,
      explanation: question.explanation || ''
    })
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
  }
})