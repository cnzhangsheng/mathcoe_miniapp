// pages/review/review.js
const app = getApp()
const reviewService = require('../../services/review')

Page({
  data: {
    activeTab: 'incorrect', // 'incorrect' or 'favorites'
    loading: true,

    // 错题列表
    wrongQuestions: [],

    // 收藏列表
    favorites: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 每次显示时重新加载数据
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.hideLoading()
        this.setData({ loading: false, wrongQuestions: [], favorites: [] })
        return
      }

      // 获取错题列表
      const wrongQuestions = await reviewService.getWrongQuestions() || []

      // 获取收藏列表
      const favorites = await reviewService.getFavorites() || []

      // 处理错题数据，格式化题目内容
      const formattedWrongQuestions = wrongQuestions.map(q => ({
        id: q.id,
        question_id: q.question_id,
        title: q.question_title || '题目',
        content: q.question_content?.text || '',
        options: q.question_options || [],
        answer: q.question_answer,
        explanation: q.question_explanation?.text || '',
        difficulty: q.question_difficulty || 'L2',
        user_answer: q.user_answer,
        retry_count: q.retry_count,
        mastered: q.mastered,
        created_at: q.created_at
      }))

      // 处理收藏数据
      const formattedFavorites = favorites.map(q => ({
        id: q.id,
        question_id: q.question_id,
        title: q.question_title || '题目',
        content: q.question_content?.text || '',
        options: q.question_options || [],
        answer: q.question_answer,
        explanation: q.question_explanation?.text || '',
        difficulty: q.question_difficulty || 'L2',
        created_at: q.created_at
      }))

      this.setData({
        loading: false,
        wrongQuestions: formattedWrongQuestions,
        favorites: formattedFavorites
      })
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 查看错题详情
  viewWrongQuestion(e) {
    const index = e.currentTarget.dataset.index
    const question = this.data.wrongQuestions[index]
    if (question) {
      // 跳转到题目解析页面
      const answerSheet = this.data.wrongQuestions.map(q => ({
        index: q.question_id,
        question_content: { text: q.content },
        question_options: q.options,
        user_answer: q.user_answer,
        correct_answer: q.answer,
        is_correct: false,
        question_explanation: { text: q.explanation }
      }))

      wx.navigateTo({
        url: `/pages/question-explanation/question-explanation?index=${index + 1}&answerSheet=${encodeURIComponent(JSON.stringify(answerSheet))}`
      })
    }
  },

  // 查看收藏题目详情
  viewFavorite(e) {
    const index = e.currentTarget.dataset.index
    const question = this.data.favorites[index]
    if (question) {
      wx.showToast({ title: '题目详情功能开发中', icon: 'none' })
    }
  },

  // 标记掌握
  async markMastered(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定标记为已掌握吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.markMastered(questionId)
            if (result && result.success) {
              wx.showToast({ title: '已标记掌握', icon: 'success' })
              // 从列表中移除
              const wrongQuestions = this.data.wrongQuestions.filter(q => q.question_id !== questionId)
              this.setData({ wrongQuestions })
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

  // 从错题本移除
  async removeWrong(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeWrongQuestion(questionId)
            if (result && result.success) {
              wx.showToast({ title: '已移除', icon: 'success' })
              // 从列表中移除
              const wrongQuestions = this.data.wrongQuestions.filter(q => q.question_id !== questionId)
              this.setData({ wrongQuestions })
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

  // 取消收藏
  async removeFavorite(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeFavorite(questionId)
            if (result && result.success) {
              wx.showToast({ title: '已取消收藏', icon: 'success' })
              // 从列表中移除
              const favorites = this.data.favorites.filter(q => q.question_id !== questionId)
              this.setData({ favorites })
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

  // 重新挑战错题
  retryWrong(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showToast({ title: '重新挑战功能开发中', icon: 'none' })
  },

  // 重新挑战收藏题目
  retryFavorite(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showToast({ title: '重新挑战功能开发中', icon: 'none' })
  }
})