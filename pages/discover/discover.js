// pages/discover/discover.js - Swiper 滑动浏览
const { processRichText } = require('../../utils/util')
const { IMAGE_BASE_URL, formatDifficulty } = require('../../utils/constants')
const app = getApp()
const discoverService = require('../../services/discover')
const { getTopicTitle, getTopicClass } = require('../../services/topics')
const reviewService = require('../../services/review')
const practiceService = require('../../services/practice')

Page({
  data: {
    loading: true,
    swiperList: [],
    swiperCurrent: 0,
    showSwipeHint: false,
    imageBaseUrl: IMAGE_BASE_URL,
  },

  _loadingNext: false,

  onLoad() {
    this.loadRandomQuestion()
    this.checkSwipeHint()
  },

  onShow() {
    if (!this.data.loading && this.data.swiperList.length === 0) {
      this.loadRandomQuestion()
    }
  },

  // 首次进入滑动提示
  checkSwipeHint() {
    const dismissed = wx.getStorageSync('swipeHintDismissed')
    if (!dismissed) {
      this.setData({ showSwipeHint: true })
    }
  },

  dismissSwipeHint() {
    if (!this.data.showSwipeHint) return
    this.setData({ showSwipeHint: false })
    wx.setStorageSync('swipeHintDismissed', true)
  },

  // 加载随机题目（首次或重试）
  async loadRandomQuestion() {
    this.setData({ loading: true })
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        this.setData({ loading: false })
        return
      }

      const question = await discoverService.getRandomQuestion()
      if (question) {
        const item = await this.buildSwiperItem(question)
        this.setData({
          loading: false,
          swiperList: [item],
          swiperCurrent: 0,
        })
        // 预加载下一题
        this.preloadNext()
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '暂无题目', icon: 'none' })
      }
    } catch (err) {
      console.error('Load question failed:', err)
      this.setData({ loading: false })
    }
  },

  // 预加载下一题（追加到 swiperList 末尾）
  async preloadNext() {
    if (this._loadingNext) return
    this._loadingNext = true

    const list = this.data.swiperList
    const placeholder = { id: 'preload-' + Date.now(), question: null }
    this.setData({ ['swiperList[' + list.length + ']']: placeholder })

    try {
      const question = await discoverService.getRandomQuestion()
      if (question) {
        const item = await this.buildSwiperItem(question)
        const idx = this.data.swiperList.findIndex(s => s.id === placeholder.id)
        if (idx !== -1) {
          const key = 'swiperList[' + idx + ']'
          this.setData({ [key]: item })
        }
        // 加载完成，如果用户已接近末尾，继续预加载下一题
        this._loadingNext = false
        const list2 = this.data.swiperList
        if (this.data.swiperCurrent >= list2.length - 2) {
          this.preloadNext()
        }
        return
      } else {
        // 无更多题目，移除占位
        const list2 = this.data.swiperList.filter(s => s.id !== placeholder.id)
        this.setData({ swiperList: list2 })
      }
    } catch (err) {
      console.error('preload next question error:', err)
      const list2 = this.data.swiperList.filter(s => s.id !== placeholder.id)
      this.setData({ swiperList: list2 })
    }
    this._loadingNext = false
  },

  // 构建 swiper item
  async buildSwiperItem(question) {
    const topicTitle = question.topic_title || getTopicTitle(question.topic_id)
    const topicClass = getTopicClass(question.topic_id)
    const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'

    const formattedQuestion = {
      id: question.id,
      title: question.title || '题目',
      content: processRichText((question.content && question.content.text) || question.content || ''),
      options: (question.options || []).map(opt => ({
        label: opt.label,
        text: processRichText((opt.content && opt.content.text) || opt.text || '')
      })),
      answer: question.answer,
      explanation: processRichText((question.explanation && question.explanation.text) || question.explanation || '暂无解析'),
    }

    const isFavorited = await reviewService.isFavorited(question.id).catch(() => false)

    return {
      id: formattedQuestion.id,
      question: formattedQuestion,
      topicTitle,
      topicClass,
      questionType,
      questionLevel: question.difficulty_level ? formatDifficulty(question.difficulty_level) : '',
      selectedOption: null,
      showAnswer: false,
      isFavorited,
    }
  },

  // Swiper 切换
  onSwiperChange(e) {
    const newIndex = e.detail.current
    const oldIndex = this.data.swiperCurrent
    if (newIndex === oldIndex) return

    this.dismissSwipeHint()
    this.setData({ swiperCurrent: newIndex })

    // 当滑到倒数第二题时，触发预加载下一题
    const list = this.data.swiperList
    if (newIndex >= list.length - 2) {
      this.preloadNext()
    }
  },

  // 选择选项
  selectOption(e) {
    const option = e.currentTarget.dataset.option
    const index = e.currentTarget.dataset.index
    const item = this.data.swiperList[index]
    if (!item || item.showAnswer) return

    const key = 'swiperList[' + index + '].selectedOption'
    this.setData({ [key]: option })
  },

  // 提交答案
  async toggleAnswer(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.swiperList[index]
    if (!item || !item.selectedOption) return

    const isCorrect = item.selectedOption === item.question.answer

    // 保存答题记录
    try {
      await practiceService.submitAnswer({
        question_id: item.question.id,
        user_answer: item.selectedOption
      })
    } catch (err) {
      console.error('保存答题记录失败:', err)
    }

    const key = 'swiperList[' + index + '].showAnswer'
    this.setData({ [key]: true })

    // 答错加到错题本
    if (!isCorrect) {
      reviewService.addWrongQuestion(item.question.id).catch(() => {})
    }
  },

  // 收藏
  async toggleFavorite(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.swiperList[index]
    if (!item) return

    try {
      if (item.isFavorited) {
        const result = await reviewService.removeFavorite(item.question.id)
        if (result && result.success) {
          this.setData({ ['swiperList[' + index + '].isFavorited']: false })
        }
      } else {
        const result = await reviewService.addFavorite(item.question.id)
        if (result) {
          this.setData({ ['swiperList[' + index + '].isFavorited']: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
    }
  },

  // 下一题
  goNextQuestion(e) {
    const index = e.currentTarget.dataset.index
    const nextIndex = index + 1
    // 确保 swiperList 有下一项
    if (nextIndex >= this.data.swiperList.length) {
      this.preloadNext()
    }
    this.setData({ swiperCurrent: nextIndex })
  },

  onShareAppMessage(e) {
    const idx = e.target?.dataset?.index ?? this.data.swiperCurrent
    const card = this.data.swiperList[idx]
    if (card?.question) {
      return {
        title: `【数学探索】${card.topicTitle} - ${card.question.title || '一道有趣的数学题'}`,
        path: '/pages/discover/discover'
      }
    }
    return { title: '数学探索', path: '/pages/discover/discover' }
  }
})