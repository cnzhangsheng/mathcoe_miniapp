// pages/review-practice/review-practice.js - 错题复习练习逻辑
const app = getApp()
const reviewService = require('../../services/review')
const questionService = require('../../services/question')
const { getTopicTitle, getTopicClass } = require('../../services/topics')
const { IMAGE_BASE_URL, formatDifficulty } = require('../../utils/constants')
const { downloadQuestionImage, saveImageToAlbum } = require('../../utils/download-image')

Page({
  data: {
    loading: true,
    questionIds: [],
    topicId: 0,  // 当前筛选的专题 ID
    questions: [],
    swiperCurrent: 0,
    totalQuestions: 0,
    progress: 0,

    completed: false,
    correctCount: 0,

    // 题目属性
    topicTitle: '',
    questionType: '单选题',

    source: 'review',
    startIndex: 0,

    imageBaseUrl: IMAGE_BASE_URL,
    isLoggedIn: false,
  },

  onLoad(options) {
    const token = wx.getStorageSync('token')
    const topicId = parseInt(options.topicId) || 0
    const source = options.source || 'review'
    const startIndex = parseInt(options.startIndex) || 0
    this.setData({ topicId, source, startIndex, isLoggedIn: !!token })

    const title = options.title ? decodeURIComponent(options.title) : (source === 'topics' ? '推荐题目练习' : '错题本练习')
    wx.setNavigationBarTitle({ title })

    if (options.ids) {
      const ids = options.ids.split(',').map(id => parseInt(id))
      this.setData({ questionIds: ids, totalQuestions: ids.length })
      this.loadQuestions(ids)
    }
  },

  async loadQuestions(ids) {
    try {
      // 获取错题列表
      const wrongQuestions = await reviewService.getAllWrongQuestions() || []

      // 根据ID筛选题目，不在错题中的从普通题库补充
      const questions = []
      for (const id of ids) {
        const wrong = wrongQuestions.find(q => q.question_id === id)
        if (wrong) {
          const options = (wrong.question_options || []).map(opt => ({
            key: opt.label || opt.key,
            value: opt.text || opt.value || opt.content?.text || ''
          }))
          questions.push({
            id: wrong.id,
            question_id: wrong.question_id,
            topic_id: wrong.question_topic_id,
            topicTitle: this.getTopicTitle(wrong.question_topic_id),
            topicClass: this.getTopicClass(wrong.question_topic_id),
            content: wrong.question_content?.text || wrong.question_content || '',
            options: options,
            answer: wrong.question_answer,
            explanation: wrong.question_explanation?.text || wrong.question_explanation || '',
            question_type: wrong.question_type || 'single',
            questionTypeText: wrong.question_type === 'multiple' ? '多选题' : '单选题',
            difficulty_level: wrong.question_difficulty_level || 0,
            levelLabel: wrong.question_difficulty_level ? formatDifficulty(wrong.question_difficulty_level) : '',
          })
        } else {
          // 从普通题库获取题目详情（含答案）
          try {
            const q = await questionService.getQuestion(id)
            if (q) {
              const options = (q.options || []).map(opt => ({
                key: opt.label || '',
                value: opt.text || opt.content?.text || ''
              }))
              questions.push({
                id: q.id,
                question_id: q.id,
                topic_id: q.topic_id,
                topicTitle: this.getTopicTitle(q.topic_id),
                topicClass: this.getTopicClass(q.topic_id),
                content: q.content?.text || '',
                options: options,
                answer: q.answer || '',
                explanation: q.explanation?.text || '',
                question_type: q.question_type || 'single',
                questionTypeText: q.question_type === 'multiple' ? '多选题' : '单选题',
                difficulty_level: q.difficulty_level || 0,
                levelLabel: q.difficulty_level ? formatDifficulty(q.difficulty_level) : '',
              })
            }
          } catch (e) {
            console.error('Failed to fetch question ' + id + ':', e)
          }
        }
      }

      // 检查每道题目的收藏状态
      if (this.data.isLoggedIn) {
        for (const q of questions) {
          q.isFavorited = await reviewService.isFavorited(q.question_id).catch(() => false)
        }
      } else {
        for (const q of questions) {
          q.isFavorited = false
        }
      }

      // 初始化每道题目的状态
      for (const q of questions) {
        q.selectedAnswer = ''
        q.showResult = false
        q.isCorrect = false
      }

      if (questions.length > 0) {
        const startIdx = Math.min(this.data.startIndex, questions.length - 1)
        this.setData({
          loading: false,
          questions,
          totalQuestions: questions.length,
          swiperCurrent: startIdx,
          progress: ((startIdx + 1) / questions.length) * 100,
          correctCount: 0,
          completed: false
        })
        this.updateQuestionMeta(questions[startIdx])
      } else {
        wx.showToast({ title: '错题已全部完成', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/review/review' })
        }, 1500)
        return
      }
    } catch (err) {
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  getTopicTitle(topicId) { return getTopicTitle(topicId) },
  getTopicClass(topicId) { return getTopicClass(topicId) },

  updateQuestionMeta(question) {
    const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'
    this.setData({
      topicTitle: question.topicTitle,
      questionType
    })
  },

  selectOption(e) {
    const idx = e.currentTarget.dataset.index
    const key = e.currentTarget.dataset.key
    const q = this.data.questions[idx]
    if (!q || q.showResult) return
    this.setData({ ['questions[' + idx + '].selectedAnswer']: key })
  },

  submitAnswer(e) {
    const idx = e.currentTarget.dataset.index
    const q = this.data.questions[idx]
    if (!q || !q.selectedAnswer) return
    const isCorrect = q.selectedAnswer === q.answer
    const updates = {}
    updates['questions[' + idx + '].showResult'] = true
    updates['questions[' + idx + '].isCorrect'] = isCorrect
    if (isCorrect) {
      this.setData({ correctCount: this.data.correctCount + 1, ...updates })
      reviewService.removeWrongQuestion(q.question_id).catch(err => {
        console.error('移除错题失败:', err)
      })
    } else {
      this.setData(updates)
      reviewService.addWrongQuestion(q.question_id).catch(err => {
        console.error('加入错题本失败:', err)
      })
    }
  },

  nextQuestion(e) {
    const idx = parseInt(e.currentTarget.dataset.index)
    if (idx < this.data.questions.length - 1) {
      this.setData({ swiperCurrent: idx + 1 })
    } else {
      const total = this.data.totalQuestions
      const correct = this.data.correctCount
      const wrong = total - correct
      const accuracyRate = total > 0 ? Math.floor((correct / total) * 100) : 0
      this.setData({ completed: true, wrongCount: wrong, accuracyRate })
    }
  },

  goHome() {
    if (this.data.source === 'topics') {
      wx.switchTab({ url: '/pages/topics/topics' })
    } else {
      wx.switchTab({ url: '/pages/review/review' })
    }
  },

  goReview() {
    // 继续练习：重新加载当前专题下的最新错题
    this.setData({ loading: true, completed: false })
    this.loadLatestWrongQuestions()
  },

  async loadLatestWrongQuestions() {
    try {
      // 获取错题列表
      const wrongQuestions = await reviewService.getAllWrongQuestions() || []

      // 根据专题筛选
      let filtered = wrongQuestions
      if (this.data.topicId > 0) {
        filtered = wrongQuestions.filter(q => parseInt(q.question_topic_id) === this.data.topicId)
      }

      if (filtered.length === 0) {
        wx.showToast({ title: '该专题暂无错题', icon: 'none' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/review/review' })
        }, 1500)
        return
      }

      // 随机抽取最多10题
      const shuffled = filtered.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, 10)

      // 转换题目格式
      const questions = selected.map(wrong => {
        const options = (wrong.question_options || []).map(opt => ({
          key: opt.label || opt.key,
          value: opt.text || opt.value || opt.content?.text || ''
        }))

        return {
          id: wrong.id,
          question_id: wrong.question_id,
          topic_id: wrong.question_topic_id,
          topicTitle: this.getTopicTitle(wrong.question_topic_id),
          topicClass: this.getTopicClass(wrong.question_topic_id),
          content: wrong.question_content?.text || wrong.question_content || '',
          options: options,
          answer: wrong.question_answer,
          explanation: wrong.question_explanation?.text || wrong.question_explanation || '',
          question_type: wrong.question_type || 'single',
          questionTypeText: wrong.question_type === 'multiple' ? '多选题' : '单选题',
          difficulty_level: wrong.question_difficulty_level || 0,
          levelLabel: wrong.question_difficulty_level ? formatDifficulty(wrong.question_difficulty_level) : '',
          selectedAnswer: '',
          showResult: false,
          isCorrect: false,
          isFavorited: false,
        }
      })

      const questionIds = questions.map(q => q.question_id)

      this.setData({
        loading: false,
        questions,
        questionIds,
        totalQuestions: questions.length,
        swiperCurrent: 0,
        progress: 100 / questions.length,
        correctCount: 0,
        completed: false
      })
      this.updateQuestionMeta(questions[0])
    } catch (err) {
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 收藏/取消收藏
  async toggleFavorite(e) {
    if (!this.data.isLoggedIn) {
      this.goToLogin()
      return
    }

    const idx = e.currentTarget.dataset.index
    const q = this.data.questions[idx]
    if (!q) return

    try {
      if (q.isFavorited) {
        const result = await reviewService.removeFavorite(q.question_id)
        if (result && result.success) {
          this.setData({ ['questions[' + idx + '].isFavorited']: false })
        }
      } else {
        const result = await reviewService.addFavorite(q.question_id)
        if (result) {
          this.setData({ ['questions[' + idx + '].isFavorited']: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
    }
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=topics' })
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  async downloadImage(e) {
    const idx = e.currentTarget.dataset.index
    const q = this.data.questions[idx]
    if (!q || !q.content) return

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
          options: (q.options || []).map(o => ({ label: o.key, text: o.value })),
        },
        topicTitle: q.topicTitle,
        questionLevel: q.levelLabel || '',
        questionType: q.questionTypeText || '单选题',
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
    const q = this.data.questions[this.data.swiperCurrent]
    if (q) {
      return {
        title: `【数学练习】${q.topicTitle || '推荐题目'} - 小学数学思维`,
        path: `/pages/discover/discover?question_id=${q.question_id}`
      }
    }
    return {
      title: '数学练习 - 小学数学思维',
      path: '/pages/topics/topics'
    }
  }
})