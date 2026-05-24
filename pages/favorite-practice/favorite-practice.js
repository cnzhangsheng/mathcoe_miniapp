// pages/favorite-practice/favorite-practice.js - 收藏练习逻辑
const app = getApp()
const { formatDifficulty, IMAGE_BASE_URL } = require('../../utils/constants')
const reviewService = require('../../services/review')
const { getTopicClass } = require('../../services/topics')

Page({
  data: {
    loading: true,
    questionIds: [],
    questions: [],
    currentIndex: 0,
    totalQuestions: 0,

    currentQuestion: null,
    selectedAnswer: '',
    showResult: false,
    isCorrect: false,

    questionType: '单选题',
    topicTitle: '',
    questionLevel: '',
    topicClass: '',

    isLoggedIn: false,
    isFavorited: false,
    imageBaseUrl: IMAGE_BASE_URL,

  },

  getTopicClass(topicId) { return getTopicClass(topicId) },

  onLoad(options) {
    const token = wx.getStorageSync('token')
    this.setData({ isLoggedIn: !!token })

    if (options.ids) {
      const ids = options.ids.split(',').map(id => parseInt(id))
      this.setData({ questionIds: ids, totalQuestions: ids.length })
      this.loadQuestions(ids)
    }
  },

  async loadQuestions(ids) {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      // 获取收藏列表
      const favorites = await reviewService.getAllFavorites() || []

      // 根据ID筛选题目
      const questions = ids.map(id => {
        const fav = favorites.find(f => f.question_id === id)
        if (fav) {
          // 转换 options 格式
          const options = (fav.question_options || []).map(opt => ({
            key: opt.label || opt.key,
            value: opt.text || opt.value || opt.content?.text || ''
          }))

          return {
            id: fav.id,
            question_id: fav.question_id,
            topic_id: fav.question_topic_id,
            topicTitle: fav.question_topic_title || '其他',
            topicClass: this.getTopicClass(fav.question_topic_id),
            difficultyLevel: fav.question_difficulty_level || 0,
            content: fav.question_content?.text || fav.question_content || '',
            options: options,
            answer: fav.question_answer,
            explanation: fav.question_explanation?.text || fav.question_explanation || '',
            question_type: fav.question_type || 'single'
          }
        }
        return null
      }).filter(q => q !== null)

      if (questions.length > 0) {
        this.setData({
          loading: false,
          questions,
          totalQuestions: questions.length,
          currentIndex: 0,
          currentQuestion: questions[0],
          correctCount: 0,
          selectedAnswer: '',
          showResult: false,
          isCorrect: false
        })
        this.updateQuestionMeta(questions[0])
        this.checkFavoriteStatus(questions[0].question_id)
      } else {
        wx.hideLoading()
        wx.showToast({ title: '未找到题目', icon: 'none' })
        this.setData({ loading: false })
      }

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  updateQuestionMeta(question) {
    const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'
    this.setData({
      questionType,
      topicTitle: question.topicTitle || '',
      topicClass: question.topicClass || '',
      questionLevel: question.difficultyLevel ? formatDifficulty(question.difficultyLevel) : ''
    })
  },

  // 检查收藏状态
  async checkFavoriteStatus(questionId) {
    if (!this.data.isLoggedIn) return
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
        const result = await reviewService.removeFavorite(this.data.currentQuestion.question_id)
        if (result) {
          this.setData({ isFavorited: false })
          wx.showToast({ title: '已取消收藏', icon: 'success' })
        }
      } else {
        const result = await reviewService.addFavorite(this.data.currentQuestion.question_id)
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

  selectOption(e) {
    if (this.data.showResult) return

    const key = e.currentTarget.dataset.key
    this.setData({ selectedAnswer: key })
  },

  submitAnswer() {
    if (!this.data.selectedAnswer) return

    const { currentQuestion, selectedAnswer } = this.data
    this.setData({
      showResult: true,
      isCorrect: selectedAnswer === currentQuestion.answer
    })
  },

  goHome() {
    getApp().globalData.reviewActiveTab = 'favorite'
    wx.switchTab({ url: '/pages/review/review' })
  },

  onShareAppMessage() {
    return {
      title: '收藏练习 - 袋鼠数学助理',
      path: '/pages/review/review'
    }
  }
})
