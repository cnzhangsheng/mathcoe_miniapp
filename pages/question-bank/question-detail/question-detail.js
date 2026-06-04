// pages/question-bank/question-detail/question-detail.js - 题目详情页
const { processRichText } = require('../../../utils/util')
const { IMAGE_BASE_URL, formatDifficulty } = require('../../../utils/constants')
const discoverService = require('../../../services/discover')
const reviewService = require('../../../services/review')
const practiceService = require('../../../services/practice')
const { getTopicTitle, getTopicClass } = require('../../../services/topics')
const { downloadQuestionImage, saveImageToAlbum } = require('../../../utils/download-image')

Page({
  data: {
    loading: true,
    question: null,
    topicTitle: '',
    topicClass: '',
    questionType: '',
    questionLevel: '',
    selectedOption: null,
    showAnswer: false,
    isFavorited: false,
    isLoggedIn: !!wx.getStorageSync('token'),
    imageBaseUrl: IMAGE_BASE_URL,
  },

  onLoad(options) {
    const questionId = options.question_id
    if (questionId) {
      this.loadQuestion(parseInt(questionId))
    } else {
      this.setData({ loading: false })
    }
  },

  async loadQuestion(questionId) {
    this.setData({ loading: true })
    try {
      const question = await discoverService.getQuestionById(questionId)
      if (!question) {
        this.setData({ loading: false })
        return
      }

      const extractText = (field) => {
        if (!field) return ''
        if (typeof field === 'string') return field
        return field.text || ''
      }

      const formattedQuestion = {
        id: question.id,
        title: question.title || '题目',
        content: processRichText(extractText(question.content)),
        options: (question.options || []).map(opt => ({
          label: opt.label,
          text: processRichText(opt.content?.text || opt.text || '')
        })),
        answer: question.answer,
        explanation: processRichText(extractText(question.explanation) || '暂无解析'),
      }

      const topicTitle = question.topic_title || getTopicTitle(question.topic_id)
      const topicClass = getTopicClass(question.topic_id)
      const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'

      const isFavorited = await reviewService.isFavorited(question.id).catch(() => false)

      this.setData({
        loading: false,
        question: formattedQuestion,
        topicTitle,
        topicClass,
        questionType,
        questionLevel: question.difficulty_level ? formatDifficulty(question.difficulty_level) : '',
        isFavorited,
      })
    } catch (err) {
      console.error('loadQuestion error:', err)
      this.setData({ loading: false })
    }
  },

  selectOption(e) {
    if (this.data.showAnswer) return
    const option = e.currentTarget.dataset.option
    this.setData({ selectedOption: option })
  },

  async submitAnswer() {
    if (!this.data.selectedOption) return
    const { question, selectedOption } = this.data
    const isCorrect = selectedOption === question.answer

    try {
      await practiceService.submitAnswer({
        question_id: question.id,
        user_answer: selectedOption,
      })
    } catch (err) {
      console.error('submitAnswer error:', err)
    }

    this.setData({ showAnswer: true })

    if (!isCorrect) {
      reviewService.addWrongQuestion(question.id).catch(() => {})
    }
  },

  async toggleFavorite() {
    const { question, isFavorited } = this.data
    try {
      if (isFavorited) {
        const result = await reviewService.removeFavorite(question.id)
        if (result?.success) {
          this.setData({ isFavorited: false })
        }
      } else {
        const result = await reviewService.addFavorite(question.id)
        if (result) {
          this.setData({ isFavorited: true })
        }
      }
    } catch (err) {
      console.error('toggleFavorite error:', err)
    }
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=question-bank' })
  },

  async downloadImage() {
    if (!this.data.question) return
    try {
      wx.showLoading({ title: '生成中...' })
      const filePath = await downloadQuestionImage(this.data.question)
      wx.hideLoading()
      await saveImageToAlbum(filePath)
    } catch (err) {
      wx.hideLoading()
      console.error('downloadImage error:', err)
    }
  },

  onShareAppMessage() {
    const { question } = this.data
    if (!question) return {}
    return {
      title: '来挑战这道数学题吧！',
      path: `/pages/discover/discover?question_id=${question.id}`,
    }
  },

  goBack() {
    wx.navigateBack()
  },
})