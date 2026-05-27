// pages/discover/discover.js - Swiper 滑动浏览
const { processRichText } = require('../../utils/util')
const { IMAGE_BASE_URL, formatDifficulty } = require('../../utils/constants')
const app = getApp()
const discoverService = require('../../services/discover')
const { getTopicTitle, getTopicClass } = require('../../services/topics')
const reviewService = require('../../services/review')
const practiceService = require('../../services/practice')
const { downloadQuestionImage, saveImageToAlbum } = require('../../utils/download-image')

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    swiperList: [],
    swiperCurrent: 0,
    showSwipeHint: false,
    imageBaseUrl: IMAGE_BASE_URL,
  },

  _loadingNext: false,

  onLoad(options) {
    this.checkLoginStatus()
    this.loadQuestions(options)
    this.checkSwipeHint()
  },

  async onPullDownRefresh() {
    this.checkLoginStatus()
    await this.loadRandomQuestion()
    wx.stopPullDownRefresh()
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    this.setData({ isLoggedIn: !!token })
  },

  // 加载题目（根据参数）
  loadQuestions(options) {
    if (options?.question_id) {
      this.loadSpecificQuestion(parseInt(options.question_id))
    } else {
      this.loadRandomQuestion()
    }
  },

  onShow() {
    this.checkLoginStatus()
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

  // 加载指定题目（通过分享进入）
  async loadSpecificQuestion(questionId) {
    this.setData({ loading: true })
    try {
      const question = await discoverService.getQuestionById(questionId)
      if (question) {
        const item = await this.buildSwiperItem(question)
        this.setData({
          loading: false,
          swiperList: [item],
          swiperCurrent: 0,
        })
        this.preloadNext()
      } else {
        this.loadRandomQuestion()
      }
    } catch (err) {
      console.error('Load specific question failed:', err)
      this.loadRandomQuestion()
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

    // 未登录用户不需要检查收藏状态
    const isFavorited = this.data.isLoggedIn
      ? await reviewService.isFavorited(question.id).catch(() => false)
      : false

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
    if (!this.data.isLoggedIn) {
      this.goToLogin()
      return
    }

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
    if (!this.data.isLoggedIn) {
      this.goToLogin()
      return
    }

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

  // 跳转登录页，带重定向参数
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=discover' })
  },

  onShareAppMessage(e) {
    // 未登录用户不触发分享
    if (!this.data.isLoggedIn) {
      return { title: '小学数学思维', path: '/pages/discover/discover' }
    }
    const idx = e.target?.dataset?.index ?? this.data.swiperCurrent
    const card = this.data.swiperList[idx]
    if (card?.question) {
      return {
        title: `【数学探索】${card.topicTitle} - ${card.question.title || '一道有趣的数学题'}`,
        path: `/pages/discover/discover?question_id=${card.question.id}`
      }
    }
    return { title: '数学探索', path: '/pages/discover/discover' }
  },

  // ==================== 下载图片 ====================

  async downloadImage(e) {
    const index = e.currentTarget.dataset.index
    const card = this.data.swiperList[index]
    if (!card || !card.question) return

    wx.showLoading({ title: '生成图片中...', mask: true })

    try {
      const canvas = await new Promise((resolve, reject) => {
        wx.createSelectorQuery().select('#questionCanvas').node((res) => {
          if (res.node) resolve(res.node)
          else reject(new Error('Canvas not found'))
        }).exec()
      })

      await downloadQuestionImage(canvas, card)
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

  // 异步下载图片，获取尺寸和本地路径
  async _loadImageInfos(urls) {
    if (!urls.length) return new Map()
    const results = await Promise.all(urls.map(url =>
      new Promise((resolve) => {
        wx.getImageInfo({
          src: url,
          success: (res) => resolve({ url, path: res.path, width: res.width, height: res.height }),
          fail: () => resolve(null),
        })
      })
    ))
    const map = new Map()
    results.forEach(r => { if (r) map.set(r.url, r) })
    return map
  },

  // 将下载的图片载入为 canvas Image 对象
  async _loadCanvasImages(canvas, imageInfos) {
    if (!imageInfos.size) return
    const tasks = []
    for (const [, info] of imageInfos) {
      tasks.push(new Promise((resolve) => {
        const img = canvas.createImage()
        img.onload = () => { info.canvasImg = img; resolve() }
        img.onerror = () => resolve()
        img.src = info.path
      }))
    }
    await Promise.all(tasks)
  },

})