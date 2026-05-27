// pages/record-detail/record-detail.js - 答题记录题目详情
const { processRichText } = require('../../utils/util')
const { formatDifficulty, IMAGE_BASE_URL } = require('../../utils/constants')
const app = getApp()
const discoverService = require('../../services/discover')
const reviewService = require('../../services/review')
const { downloadQuestionImage, saveImageToAlbum } = require('../../utils/download-image')

Page({
  data: {
    loading: true,
    question: null,
    questionId: null,
    userAnswer: '',
    correctAnswer: '',
    isCorrect: false,
    topicTitle: '',
    questionType: '单选题',
    questionLevel: '',
    isLoggedIn: false,
    isFavorited: false,
    imageBaseUrl: IMAGE_BASE_URL,
  },

  getTopicClass(topicId) {
    const classes = {
      1001: 'topic-tuxing', 1002: 'topic-luoji',
      1003: 'topic-yingyong', 1004: 'topic-yunsuan',
    }
    return classes[topicId] || 'topic-default'
  },

  onLoad(options) {
    // 从参数获取题目ID和用户答案
    const questionId = options.question_id
    const userAnswer = options.user_answer || ''
    const topicTitle = decodeURIComponent(options.topic_title || '日常练习')
    const topicId = parseInt(options.topic_id) || 0
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
      topicTitle,
      topicClass: this.getTopicClass(topicId),
      isLoggedIn: !!wx.getStorageSync('token'),
    })

    this.loadQuestionDetail(questionId)

    // 检查收藏状态
    if (wx.getStorageSync('token') && questionId) {
      this.checkFavoriteStatus(questionId)
    }
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
          content: processRichText(this.extractContent(question.content)),
          options: this.formatOptions(question.options),
          answer: question.answer,
          explanation: processRichText(this.extractContent(question.explanation) || '暂无解析'),
        }

        this.setData({
          loading: false,
          question: formattedQuestion,
          correctAnswer: question.answer,
          questionType,
          questionLevel: question.difficulty_level ? formatDifficulty(question.difficulty_level) : '',
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
      text: processRichText(this.extractContent(opt.content) || opt.text || '')
    }))
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

  // 分享
  onShareAppMessage() {
    const q = this.data
    return {
      title: `【${q.topicTitle}】一道有趣的数学题 - 小学数学思维`,
      path: `/pages/record-detail/record-detail?question_id=${q.questionId}&user_answer=${q.userAnswer}&topic_title=${encodeURIComponent(q.topicTitle)}`
    }
  },

  // 去登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=topics' })
  },

  goBack() {
    wx.navigateBack()
  },

  async downloadImage() {
    const q = this.data.question
    if (!q) return

    wx.showLoading({ title: '生成图片中...', mask: true })
    try {
      const canvas = await new Promise((resolve, reject) => {
        wx.createSelectorQuery().select('#questionCanvas').node((res) => {
          if (res.node) resolve(res.node)
          else reject(new Error('Canvas not found'))
        }).exec()
      })

      await downloadQuestionImage(canvas, {
        question: {
          content: q.content || '',
          options: q.options || [],
        },
        topicTitle: this.data.topicTitle,
        questionLevel: this.data.questionLevel || '',
        questionType: this.data.questionType || '单选题',
      })
      await saveImageToAlbum(canvas)
      wx.hideLoading()
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      const msg = err.errMsg || err.message || ''
      if (msg.includes('deny') || msg.includes('denied') || msg.includes('fail auth')) {
        wx.showModal({
          title: '提示',
          content: '需要相册权限才能保存图片，请在设置中开启',
          confirmText: '去设置',
          success: (res) => { if (res.confirm) wx.openSetting() },
        })
      } else {
        wx.showToast({ title: '下载失败', icon: 'none' })
        console.error('Download image error:', err)
      }
    }
  }
})