// pages/topic-question-detail/topic-question-detail.js - 100%复刻 kangaroo-math-brain TopicDetail.tsx
const practiceService = require('../../services/practice')
const { IMAGE_BASE_URL, formatDifficulty } = require('../../utils/constants')

const reviewService = require('../../services/review')
const { getTopicClass } = require('../../services/topics')
const { processRichText } = require('../../utils/util')

Page({
  data: {
    topicId: null,
    topicTitle: '',
    sessionId: null,
    topicClass: '',
    imageBaseUrl: IMAGE_BASE_URL,

    // 排序
    sortBy: 'default',
    sortOptions: [
      { value: 'default', label: '默认排序' },
      { value: 'time', label: '最新时间' },
      { value: 'random', label: '随机排序' },
            { value: 'favorites', label: '收藏最多' },
      { value: 'wrong_count', label: '易错优先' },
    ],
    showSortPicker: false,

    // Swiper 数据
    swiperList: [],
    swiperCurrent: 0,
    totalQuestions: 0,

    // 完成 / 无题 状态
    isCompleted: false,
    noQuestions: false,

    // 预加载图片
    preloadedImageUrls: [],
  },

  onLoad(options) {
    const topicId = parseInt(options.topic_id)
    const title = options.title || '专题详情'
    const sortBy = options.sort_by || 'default'
    const targetQuestionId = options.question_id ? parseInt(options.question_id) : null

    if (!topicId) {
      wx.showToast({ title: '缺少专题参数', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const decodedTitle = decodeURIComponent(title)
    wx.setNavigationBarTitle({ title: decodedTitle + '题目' })
    this.setData({ topicId, topicTitle: decodedTitle, sortBy, topicClass: getTopicClass(topicId) })
    this._targetQuestionId = targetQuestionId
    this.loadQuestions(topicId)
  },

  async loadQuestions(topicId) {
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      const result = await practiceService.startPractice({ topic_id: topicId, sort_by: this.data.sortBy })
      if (!result || !result.questions || result.questions.length === 0) {
        this.setData({ noQuestions: true })
        return
      }

      const questions = result.questions
      this.questionsList = questions

      // 预加载图片
      const urlSet = new Set()
      questions.forEach(q => {
        if (!q) return
        const htmlSources = []
        if (q.content) {
          if (typeof q.content === 'string') htmlSources.push(q.content)
          else if (q.content.text) htmlSources.push(q.content.text)
          if (q.content.images && Array.isArray(q.content.images)) {
            q.content.images.forEach(url => urlSet.add(url))
          }
        }
        if (q.options) {
          q.options.forEach(opt => {
            if (opt.content) {
              if (typeof opt.content === 'string') htmlSources.push(opt.content)
              else if (opt.content.text) htmlSources.push(opt.content.text)
              if (opt.content.images && Array.isArray(opt.content.images)) {
                opt.content.images.forEach(url => urlSet.add(url))
              }
            }
            if (opt.text) htmlSources.push(opt.text)
          })
        }
        htmlSources.forEach(html => {
          if (!html || typeof html !== 'string') return
          const regex = /<img[^>]+src=["']([^"']+)["']/gi
          let match
          while ((match = regex.exec(html)) !== null) {
            urlSet.add(match[1])
          }
        })
      })
      const urls = Array.from(urlSet)
      if (urls.length > 0) {
        this.setData({ preloadedImageUrls: urls })
      }

      // 构建 swiperList
      const swiperList = questions.map((q, idx) => ({
        id: q.id || idx,
        question: q,
        questionContentHtml: this.extractContentHtml(q),
        questionTypeText: this.getQuestionTypeText(q),
        questionLevel: q.difficulty_level ? formatDifficulty(q.difficulty_level) : '',
        options: this.formatOptions(q.options),
        selectedOption: null,
        isSubmitted: false,
        correctAnswer: '',
        analysis: { logic: '', tip: '', point: '' },
        isBookmarked: false,
      }))

      // 异步获取第一张卡片的收藏状态
      this.loadCardStates(0, swiperList)

      this.setData({
        swiperList,
        totalQuestions: questions.length,
        sessionId: result.session_id,
        swiperCurrent: 0,
      })

      // 如果是从分享链接进入且指定了题目，跳转到对应位置
      if (this._targetQuestionId) {
        const targetIdx = swiperList.findIndex(s => s.id === this._targetQuestionId)
        if (targetIdx !== -1) {
          this.setData({ swiperCurrent: targetIdx })
          this.loadCardStates(targetIdx, swiperList)
        }
        this._targetQuestionId = null
      }
    } catch (err) {
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 异步加载某张卡片的收藏状态
  async loadCardStates(idx, swiperList) {
    if (!swiperList || idx >= swiperList.length) return
    const card = swiperList[idx]
    if (!card || !card.question) return

    try {
      const isBookmarked = await reviewService.isFavorited(card.question.id).catch(() => false)
      this.setData({ [`swiperList[${idx}].isBookmarked`]: isBookmarked })
    } catch (err) {
      console.error('loadCardStates error:', err)
    }
  },

  // Swiper 切换
  onSwiperChange(e) {
    const newIdx = e.detail.current
    const oldIdx = this.data.swiperCurrent
    if (newIdx === oldIdx) return
    this.setData({ swiperCurrent: newIdx })

    // 异步加载新卡片的点赞/收藏状态
    this.loadCardStates(newIdx, this.data.swiperList)
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
    if (question.content) {
      if (typeof question.content === 'string') {
        return processRichText(question.content)
      } else if (typeof question.content === 'object' && question.content.text) {
        return processRichText(question.content.text)
      }
    }
    return question.title || '题目内容'
  },

  formatOptions(options) {
    if (!options || !Array.isArray(options)) return []
    return options.map(opt => {
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
        labelHtml: processRichText(labelHtml)
      }
    })
  },

  // 去除 HTML 标签
  stripHtml(html) {
    if (!html || typeof html !== 'string') return ''
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  },

  // 选择选项
  selectOption(e) {
    const idx = e.currentTarget.dataset.index
    const option = e.currentTarget.dataset.option
    const card = this.data.swiperList[idx]
    if (!card || card.isSubmitted) return

    this.setData({ [`swiperList[${idx}].selectedOption`]: option })
  },

  // 提交答案（查看答案）
  handleSubmit(e) {
    const idx = e.currentTarget.dataset.index
    const card = this.data.swiperList[idx]
    if (!card || !card.selectedOption) return

    const { question, selectedOption } = card
    const correctAnswer = question.answer || ''

    const explanation = question.explanation || {}
    const explanationText = this.extractText(explanation)

    this.setData({
      [`swiperList[${idx}].isSubmitted`]: true,
      [`swiperList[${idx}].correctAnswer`]: correctAnswer,
      [`swiperList[${idx}].analysis`]: {
        logic: explanationText || '暂无解析',
        tip: '',
        point: `${question.difficulty_level ? formatDifficulty(question.difficulty_level) : '基础'} ${question.question_type || '题型'}`,
      },
    })

    // 提交答案到后端
    practiceService.submitAnswer({
      question_id: question.id,
      user_answer: selectedOption
    }).catch(err => console.error('Submit answer failed:', err))
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
    if (text.includes('<')) {
      text = text.replace(/<[^>]+>/g, '').trim()
    }
    return text.trim()
  },

  // 收藏切换
  async toggleBookmark(e) {
    const idx = e.currentTarget.dataset.index
    const card = this.data.swiperList[idx]
    if (!card || !card.question) return

    try {
      if (card.isBookmarked) {
        const result = await reviewService.removeFavorite(card.question.id)
        if (result && result.success) {
          this.setData({ [`swiperList[${idx}].isBookmarked`]: false })
        }
      } else {
        const result = await reviewService.addFavorite(card.question.id)
        if (result) {
          this.setData({ [`swiperList[${idx}].isBookmarked`]: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
    }
  },

  // 排序选择
  handleSortChange(e) {
    const sortBy = e.currentTarget.dataset.value
    this.setData({ sortBy, showSortPicker: false })
    this.loadQuestions(this.data.topicId)
  },

  toggleSortPicker() {
    this.setData({ showSortPicker: !this.data.showSortPicker })
  },

  // 下一题
  goNextQuestion(e) {
    const idx = e.currentTarget.dataset.index
    if (idx < this.data.totalQuestions - 1) {
      this.setData({ swiperCurrent: idx + 1 })
    }
  },

  // 分享
  onShareAppMessage(e) {
    const idx = e.target?.dataset?.index ?? this.data.swiperCurrent
    const card = this.data.swiperList[idx]
    if (card?.question) {
      return {
        title: `【${this.data.topicTitle}】${card.question.title || '一道有趣的数学题'}`,
        path: `/pages/topic-question-detail/topic-question-detail?topic_id=${this.data.topicId}&title=${encodeURIComponent(this.data.topicTitle)}&sort_by=${this.data.sortBy}&question_id=${card.question.id}`
      }
    }
    return { title: '数学专题练习', path: `/pages/topic-question-detail/topic-question-detail?topic_id=${this.data.topicId}&title=${encodeURIComponent(this.data.topicTitle)}` }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  onUnload() {
    // 清理
  }
})
