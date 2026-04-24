// pages/topic-question-detail/topic-question-detail.js - 100%复刻 kangaroo-math-brain TopicDetail.tsx
const practiceService = require('../../services/practice')
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
      this.setData({
        sessionId: result.session_id,
        totalQuestions: result.questions.length,
        question: firstQuestion,
        questions: result.questions,
        questionContentHtml: this.extractContentHtml(firstQuestion),
        options: this.formatOptions(firstQuestion.options),
        isLiked: false,
        isBookmarked: false,
        likeCount: 0
      })
    } catch (err) {
      console.error('Load question failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
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
  toggleLike() {
    const isLiked = !this.data.isLiked
    const likeCount = isLiked ? (this.data.likeCount || 0) + 1 : Math.max(0, (this.data.likeCount || 1) - 1)
    this.setData({ isLiked, likeCount })
  },

  // 收藏切换
  toggleBookmark() {
    this.setData({ isBookmarked: !this.data.isBookmarked })
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
        point: `${question.level ? 'L' + question.level : '基础'} ${question.question_type || '题型'}`
      }
    })

    // 提交答案到后端
    practiceService.submitAnswer({
      question_id: question.id,
      user_answer: selectedOption
    }).catch(err => console.error('Submit answer failed:', err))
  },

  // 下一题
  handleNext() {
    const { currentIndex, totalQuestions } = this.data

    if (currentIndex >= totalQuestions) {
      this.setData({ isCompleted: true })
      return
    }

    // 从题目列表获取下一题
    const nextIndex = currentIndex
    const nextQuestion = this.questionsList[nextIndex]

    this.setData({
      currentIndex: currentIndex + 1,
      question: nextQuestion,
      questionContentHtml: this.extractContentHtml(nextQuestion),
      options: this.formatOptions(nextQuestion.options),
      selectedOption: null,
      isSubmitted: false,
      correctAnswer: '',
      analysis: { logic: '', tip: '', point: '' },
      isLiked: false,
      isBookmarked: false,
      likeCount: 0
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