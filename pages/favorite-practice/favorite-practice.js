// pages/favorite-practice/favorite-practice.js - 收藏练习逻辑
const app = getApp()
const reviewService = require('../../services/review')

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

    completed: false,
    correctCount: 0,

    questionType: '单选题',
    topicTitle: '',
    questionLevel: ''
  },

  onLoad(options) {
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
      const favorites = await reviewService.getFavorites() || []

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
      questionLevel: question.difficultyLevel ? `L${question.difficultyLevel}` : ''
    })
  },

  selectOption(e) {
    if (this.data.showResult) return

    const key = e.currentTarget.dataset.key
    this.setData({ selectedAnswer: key })
  },

  submitAnswer() {
    if (!this.data.selectedAnswer) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }

    const { currentQuestion, selectedAnswer } = this.data
    const isCorrect = selectedAnswer === currentQuestion.answer

    this.setData({
      showResult: true,
      isCorrect
    })

    if (isCorrect) {
      this.setData({ correctCount: this.data.correctCount + 1 })
    }
  },

  nextQuestion() {
    const { currentIndex, questions } = this.data

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1
      const nextQuestion = questions[nextIndex]

      this.setData({
        currentIndex: nextIndex,
        currentQuestion: nextQuestion,
        selectedAnswer: '',
        showResult: false,
        isCorrect: false
      })
      this.updateQuestionMeta(nextQuestion)
    } else {
      // 完成 - 返回上一页
      wx.navigateBack()
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/review/review' })
  },

  goReview() {
    // 重新开始练习
    this.setData({ loading: true, completed: false })
    this.loadQuestions(this.data.questionIds)
  },

  onShareAppMessage() {
    return {
      title: '收藏练习 - 袋鼠数学助理',
      path: '/pages/review/review'
    }
  }
})