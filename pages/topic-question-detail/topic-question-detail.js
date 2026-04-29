// pages/topic-question-detail/topic-question-detail.js - 100%复刻 kangaroo-math-brain TopicDetail.tsx
const practiceService = require('../../services/practice')
const discoverService = require('../../services/discover')
const reviewService = require('../../services/review')
const app = getApp()

Page({
  data: {
    topicId: null,
    topicTitle: '',
    sessionId: null,

    // 题目数据
    currentIndex: 1,
    totalQuestions: 0,
    question: null,
    questionContentHtml: '',
    questionTypeText: '单选题',
    questionLevel: '',
    options: [],
    selectedOption: null,
    isSubmitted: false,
    isLiked: false,
    isBookmarked: false,
    likeCount: 0,

    // 完成状态
    isCompleted: false,
    noQuestions: false,

    // 题目列表（用于下一题）
    questions: [],

    // 答案解析
    correctAnswer: '',
    analysis: {
      logic: '',
      tip: '',
      point: ''
    }
  },

  onLoad(options) {
    const topicId = options.topic_id
    const title = options.title || '专题详情'

    if (!topicId) {
      wx.showToast({ title: '缺少专题参数', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({ topicId, topicTitle: decodeURIComponent(title) })
    this.loadQuestion(topicId)
  },

  async loadQuestion(topicId) {
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      const result = await practiceService.startPractice({ topic_id: topicId })
      if (!result || !result.questions || result.questions.length === 0) {
        this.setData({ noQuestions: true })
        return
      }

      // 保存所有题目
      this.questionsList = result.questions
      const firstQuestion = result.questions[0]

      // 获取点赞状态和收藏状态
      const likeStatus = await discoverService.getLikeStatus(firstQuestion.id).catch(() => null)
      const isLiked = likeStatus?.is_liked || false
      const likeCount = likeStatus?.like_count || 0

      // 检查是否已收藏
      const isBookmarked = await reviewService.isFavorited(firstQuestion.id).catch(() => false)

      this.setData({
        sessionId: result.session_id,
        totalQuestions: result.questions.length,
        question: firstQuestion,
        questions: result.questions,
        questionContentHtml: this.extractContentHtml(firstQuestion),
        questionTypeText: this.getQuestionTypeText(firstQuestion),
        questionLevel: firstQuestion.difficulty_level ? `L${firstQuestion.difficulty_level}` : '',
        options: this.formatOptions(firstQuestion.options),
        isLiked,
        isBookmarked,
        likeCount
      })
    } catch (err) {
      console.error('Load question failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 获取题目类型文本
  getQuestionTypeText(question) {
    if (!question || !question.question_type) return '单选题'
    const type = question.question_type.toLowerCase()
    if (type === 'multiple') return '多选题'
    if (type === 'single') return '单选题'
    return '单选题'
  },

  // 提取题目内容 HTML
  extractContentHtml(question) {
    if (!question) return '题目内容'
    // 从 content.text 提取
    if (question.content) {
      if (typeof question.content === 'string') {
        return question.content
      } else if (typeof question.content === 'object' && question.content.text) {
        return question.content.text
      }
    }
    // fallback 到 title
    return question.title || '题目内容'
  },

  formatOptions(options) {
    if (!options || !Array.isArray(options)) return []
    return options.map(opt => {
      // 提取 labelHtml（选项 HTML 内容）
      let labelHtml = ''
      let label = ''
      if (opt.content) {
        if (typeof opt.content === 'string') {
          labelHtml = opt.content
          label = this.stripHtml(opt.content)
        } else if (typeof opt.content === 'object' && opt.content.text) {
          labelHtml = opt.content.text
          label = this.stripHtml(opt.content.text)
        }
      }
      if (!labelHtml && opt.text) {
        labelHtml = opt.text
        label = this.stripHtml(opt.text)
      }
      return {
        id: opt.label || 'A',
        label: label || '选项内容',
        labelHtml: labelHtml
      }
    })
  },

  // 去除 HTML 标签（用于纯文本）
  stripHtml(html) {
    if (!html || typeof html !== 'string') return ''
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  },

  // 选择选项
  selectOption(e) {
    if (this.data.isSubmitted) return
    const option = e.currentTarget.dataset.option
    this.setData({ selectedOption: option })
  },

  // 提取纯文本（用于解析）
  extractText(content) {
    if (!content) return ''

    let text = ''
    if (typeof content === 'string') {
      text = content
    } else if (typeof content === 'object' && content.text) {
      text = content.text
    }

    if (typeof text !== 'string') return ''

    // 去掉 HTML 标签
    if (text.includes('<')) {
      text = text.replace(/<[^>]+>/g, '').trim()
    }

    return text.trim()
  },

  // 点赞切换
  async toggleLike() {
    const { question, isLiked, likeCount } = this.data
    if (!question) return

    try {
      if (isLiked) {
        // 取消点赞
        const result = await discoverService.removeLike(question.id)
        if (result && result.success) {
          this.setData({ isLiked: false, likeCount: likeCount - 1 })
        }
      } else {
        // 添加点赞
        const result = await discoverService.addLike(question.id)
        if (result) {
          this.setData({ isLiked: true, likeCount: likeCount + 1 })
        }
      }
    } catch (err) {
      console.error('Like failed:', err)
    }
  },

  // 收藏切换
  async toggleBookmark() {
    const { question, isBookmarked } = this.data
    if (!question) return

    try {
      if (isBookmarked) {
        // 取消收藏
        const result = await reviewService.removeFavorite(question.id)
        if (result && result.success) {
          this.setData({ isBookmarked: false })
        }
      } else {
        // 添加收藏
        const result = await reviewService.addFavorite(question.id)
        if (result) {
          this.setData({ isBookmarked: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
    }
  },

  // 提交答案（查看答案）
  handleSubmit() {
    if (!this.data.selectedOption) return

    const { question, selectedOption } = this.data
    const correctAnswer = question.answer || ''

    // 处理 explanation
    const explanation = question.explanation || {}
    const explanationText = this.extractText(explanation)

    this.setData({
      isSubmitted: true,
      correctAnswer,
      analysis: {
        logic: explanationText || '暂无解析',
        tip: '',
        point: `${question.difficulty_level ? 'L' + question.difficulty_level : '基础'} ${question.question_type || '题型'}`
      }
    })

    // 提交答案到后端
    practiceService.submitAnswer({
      question_id: question.id,
      user_answer: selectedOption
    }).catch(err => console.error('Submit answer failed:', err))
  },

  // 下一题
  async handleNext() {
    const { currentIndex, totalQuestions } = this.data

    if (currentIndex >= totalQuestions) {
      // 完成所有题目，直接返回专题页面
      wx.navigateBack()
      return
    }

    // 从题目列表获取下一题
    const nextIndex = currentIndex
    const nextQuestion = this.questionsList[nextIndex]

    // 获取点赞状态和收藏状态
    const likeStatus = await discoverService.getLikeStatus(nextQuestion.id).catch(() => null)
    const isLiked = likeStatus?.is_liked || false
    const likeCount = likeStatus?.like_count || 0

    // 检查是否已收藏
    const isBookmarked = await reviewService.isFavorited(nextQuestion.id).catch(() => false)

    this.setData({
      currentIndex: currentIndex + 1,
      question: nextQuestion,
      questionContentHtml: this.extractContentHtml(nextQuestion),
      questionTypeText: this.getQuestionTypeText(nextQuestion),
      questionLevel: nextQuestion.difficulty_level ? `L${nextQuestion.difficulty_level}` : '',
      options: this.formatOptions(nextQuestion.options),
      selectedOption: null,
      isSubmitted: false,
      correctAnswer: '',
      analysis: { logic: '', tip: '', point: '' },
      isLiked,
      isBookmarked,
      likeCount
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  onUnload() {
    // 清理
  }
})