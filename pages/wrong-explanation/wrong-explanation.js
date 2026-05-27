// pages/wrong-explanation/wrong-explanation.js - 错题解析页面
const { processRichText } = require('../../utils/util')
const { formatDifficulty, IMAGE_BASE_URL } = require('../../utils/constants')
const { getTopicClass } = require('../../services/topics')
const reviewService = require('../../services/review')
const { downloadQuestionImage, saveImageToAlbum } = require('../../utils/download-image')

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

  async downloadImage() {
    const d = this.data
    if (!d.content) return

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
          content: d.content || '',
          options: (d.options || []).map(o => ({ label: o.key, text: o.value })),
        },
        topicTitle: d.topicTitle,
        questionLevel: d.questionLevel || '',
        questionType: '单选题',
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
  },

  onShareAppMessage() {
    const q = this.data
    return {
      title: `【数学练习】${q.topicTitle || '错题'} - 小学数学思维`,
      path: `/pages/discover/discover?question_id=${q.questionId}`
    }
  }
})