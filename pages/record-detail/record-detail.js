// pages/record-detail/record-detail.js - 答题记录题目详情
const app = getApp()
const discoverService = require('../../services/discover')

Page({
  data: {
    loading: true,
    question: null,
    questionId: null,
    userAnswer: '',
    correctAnswer: '',
    isCorrect: false,
    topicTitle: '',
    questionType: '单选题'
  },

  onLoad(options) {
    // 从参数获取题目ID和用户答案
    const questionId = options.question_id
    const userAnswer = options.user_answer || ''
    const topicTitle = decodeURIComponent(options.topic_title || '日常练习')
    const isCorrect = options.is_correct === 'true' || options.is_correct === '1'

    if (!questionId) {
      wx.showToast({ title: '缺少题目参数', icon: 'none' })
      this.setData({ loading: false })
      return
    }

    this.setData({
      questionId: parseInt(questionId),
      userAnswer,
      isCorrect,
      topicTitle
    })

    this.loadQuestionDetail(questionId)
  },

  async loadQuestionDetail(questionId) {
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        this.setData({ loading: false })
        return
      }

      // 获取题目详情
      const question = await discoverService.getQuestionById(questionId)

      if (question) {
        const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'

        // 格式化题目
        const formattedQuestion = {
          id: question.id,
          title: question.title || '题目',
          content: this.extractContent(question.content),
          options: this.formatOptions(question.options),
          answer: question.answer,
          explanation: this.extractContent(question.explanation) || '暂无解析',
          difficulty: question.difficulty
        }

        this.setData({
          loading: false,
          question: formattedQuestion,
          correctAnswer: question.answer,
          questionType
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '题目不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('Load question detail failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  extractContent(content) {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (typeof content === 'object' && content.text) return content.text
    return ''
  },

  formatOptions(options) {
    if (!options || !Array.isArray(options)) return []
    return options.map(opt => ({
      label: opt.label || 'A',
      text: this.extractContent(opt.content) || opt.text || ''
    }))
  },

  goBack() {
    wx.navigateBack()
  }
})