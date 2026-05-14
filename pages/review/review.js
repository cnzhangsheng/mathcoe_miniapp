// pages/review/review.js - 复习中心页面逻辑
const app = getApp()
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    activeTab: 'wrong',  // wrong | favorite
    selectedTopicId: 0,  // 0表示全部

    // 统计数据
    pendingWrongCount: 0,
    favoriteCount: 0,

    // 筛选专题列表
    filterTopics: [{ id: 0, title: '全部' }],

    // 错题列表（分页）
    wrongQuestions: [],
    wrongPage: 1,
    wrongPageSize: 10,
    wrongHasMore: true,
    wrongTotal: 0,
    wrongLoading: false,

    // 收藏列表（分页）
    favoriteQuestions: [],
    favoritePage: 1,
    favoritePageSize: 10,
    favoriteHasMore: true,
    favoriteTotal: 0,
    favoriteLoading: false,
  },

  onLoad() {
    this.loadInitialData()
  },

  onShow() {
    if (!this.data.loading) {
      this.loadInitialData()
    }
  },

  // 下拉加载更多
  onReachBottom() {
    if (this.data.activeTab === 'wrong' && this.data.wrongHasMore && !this.data.wrongLoading) {
      this.loadMoreWrongQuestions()
    } else if (this.data.activeTab === 'favorite' && this.data.favoriteHasMore && !this.data.favoriteLoading) {
      this.loadMoreFavoriteQuestions()
    }
  },

  // 初始化加载：专题列表 + 当前 tab 第一页
  async loadInitialData() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.hideLoading()
        this.setData({ loading: false })
        return
      }

      const [topics] = await Promise.all([
        reviewService.getTopics().catch(() => []),
      ])

      const filterTopics = [
        { id: 0, title: '全部' },
        ...(topics || []).map(t => ({ id: t.id, title: t.title }))
      ]

      this.setData({ filterTopics })

      // 加载当前 tab 的第一页
      if (this.data.activeTab === 'wrong') {
        await this.loadWrongQuestions(1)
      } else {
        await this.loadFavoriteQuestions(1)
      }

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  // 加载错题某一页
  async loadWrongQuestions(page, append = false) {
    this.setData({ wrongLoading: true })
    try {
      const result = await reviewService.getWrongQuestions(
        page,
        this.data.wrongPageSize,
        this.data.selectedTopicId > 0 ? this.data.selectedTopicId : undefined
      )
      if (!result) {
        this.setData({ wrongLoading: false, wrongHasMore: false })
        return
      }

      const items = this.processWrongQuestions(result.items || [])
      this.setData({
        wrongQuestions: append ? [...this.data.wrongQuestions, ...items] : items,
        wrongPage: page,
        wrongTotal: result.total || 0,
        wrongHasMore: (result.page * result.page_size) < result.total,
        wrongLoading: false,
        pendingWrongCount: result.total || 0,
        loading: false,
      })
    } catch (err) {
      console.error('loadWrongQuestions error:', err)
      this.setData({ wrongLoading: false })
    }
  },

  // 加载收藏某一页
  async loadFavoriteQuestions(page, append = false) {
    this.setData({ favoriteLoading: true })
    try {
      const result = await reviewService.getFavorites(page, this.data.favoritePageSize)
      if (!result) {
        this.setData({ favoriteLoading: false, favoriteHasMore: false })
        return
      }

      const items = this.processFavoriteQuestions(result.items || [])
      this.setData({
        favoriteQuestions: append ? [...this.data.favoriteQuestions, ...items] : items,
        favoritePage: page,
        favoriteTotal: result.total || 0,
        favoriteHasMore: (result.page * result.page_size) < result.total,
        favoriteLoading: false,
        favoriteCount: result.total || 0,
        loading: false,
      })
    } catch (err) {
      console.error('loadFavoriteQuestions error:', err)
      this.setData({ favoriteLoading: false })
    }
  },

  // 加载更多错题
  loadMoreWrongQuestions() {
    if (!this.data.wrongHasMore || this.data.wrongLoading) return
    this.loadWrongQuestions(this.data.wrongPage + 1, true)
  },

  // 加载更多收藏
  loadMoreFavoriteQuestions() {
    if (!this.data.favoriteHasMore || this.data.favoriteLoading) return
    this.loadFavoriteQuestions(this.data.favoritePage + 1, true)
  },

  // 处理错题数据
  processWrongQuestions(questions) {
    return questions.map(q => {
      const optionsList = (q.question_options || []).map(opt => ({
        key: opt.label || opt.key,
        value: opt.text || opt.value || opt.content?.text || ''
      }))

      return {
        id: q.id,
        question_id: q.question_id,
        topic_id: parseInt(q.question_topic_id) || parseInt(q.topic_id) || 0,
        topicTitle: q.question_topic_title || this.getTopicTitle(q.question_topic_id),
        level: q.question_difficulty_level,
        content: q.question_content?.text || q.content || '',
        options: optionsList,
        answer: q.question_answer,
        explanation: q.question_explanation?.text || '',
        user_answer: q.user_answer,
        retry_count: q.retry_count || 0,
        created_at: q.created_at,
        last_retry_at: q.last_retry_at,
        dateLabel: this.getDateLabel(q.last_retry_at || q.created_at, true)
      }
    })
  },

  // 处理收藏数据
  processFavoriteQuestions(questions) {
    return questions.map(q => {
      const optionsList = (q.question_options || []).map(opt => ({
        key: opt.label || opt.key,
        value: opt.text || opt.value || opt.content?.text || ''
      }))

      return {
        id: q.id,
        question_id: q.question_id,
        topic_id: q.question_topic_id,
        topicTitle: q.question_topic_title || this.getTopicTitle(q.question_topic_id),
        level: q.question_difficulty_level,
        content: q.question_content?.text || q.content || '',
        options: optionsList,
        answer: q.question_answer,
        explanation: q.question_explanation?.text || '',
        created_at: q.created_at,
        dateLabel: this.getDateLabel(q.created_at, true)
      }
    })
  },

  // 获取专题标题
  getTopicTitle(topicId) {
    const titles = {
      1: '算术与计数',
      2: '逻辑与推理',
      3: '几何与空间',
      4: '规律与观察',
      5: '综合应用题'
    }
    return titles[topicId] || '其他'
  },

  // 获取日期标签
  getDateLabel(dateStr, showTime = false) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const pad = n => n.toString().padStart(2, '0')
    const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const timeStr = showTime ? ` ${pad(date.getHours())}:${pad(date.getMinutes())}` : ''

    if (formatDate(date) === formatDate(today)) return '今天' + timeStr
    if (formatDate(date) === formatDate(yesterday)) return '昨天' + timeStr
    return `${date.getMonth()+1}/${date.getDate()}${timeStr}`
  },

  // Tab切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, selectedTopicId: 0 })
    // 切换后加载对应 tab 数据
    if (!this.data.loading) {
      if (tab === 'wrong' && this.data.wrongQuestions.length === 0) {
        this.loadWrongQuestions(1)
      } else if (tab === 'favorite' && this.data.favoriteQuestions.length === 0) {
        this.loadFavoriteQuestions(1)
      }
    }
  },

  // 专题筛选
  selectTopic(e) {
    const topicId = parseInt(e.currentTarget.dataset.id) || 0
    this.setData({
      selectedTopicId: topicId,
      wrongQuestions: [],
      wrongPage: 1,
      wrongHasMore: true,
    })
    this.loadWrongQuestions(1)
  },

  // 开始复习
  startReview() {
    const questions = this.data.wrongQuestions
    if (questions.length === 0) {
      wx.showToast({ title: '没有错题', icon: 'none' })
      return
    }

    const questionIds = questions.map(q => q.question_id)
    const topicId = this.data.selectedTopicId || 0
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${questionIds.join(',')}&topicId=${topicId}`
    })
  },

  // 查看全部错题
  viewAllWrong() {
    wx.navigateTo({
      url: '/pages/all-wrong/all-wrong'
    })
  },

  // 查看错题详情
  viewWrongQuestion(e) {
    const question = e.currentTarget.dataset.question
    wx.navigateTo({
      url: `/pages/wrong-explanation/wrong-explanation?question=${encodeURIComponent(JSON.stringify(question))}`
    })
  },

  // 查看收藏题目详情
  viewFavoriteQuestion(e) {
    const question = e.currentTarget.dataset.question
    wx.navigateTo({
      url: `/pages/wrong-explanation/wrong-explanation?question=${encodeURIComponent(JSON.stringify(question))}`
    })
  },

  // 重练单题
  retryQuestion(e) {
    const question = e.currentTarget.dataset.question
    wx.navigateTo({
      url: `/pages/review-practice/review-practice?ids=${question.question_id}`
    })
  },

  // 从错题本移除
  async removeWrong(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeWrongQuestion(questionId)
            if (result) {
              wx.showToast({ title: '已移除', icon: 'success' })
              // 重新加载当前页
              this.loadWrongQuestions(this.data.wrongPage)
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

  // 取消收藏
  async removeFavorite(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeFavorite(questionId)
            if (result) {
              wx.showToast({ title: '已取消收藏', icon: 'success' })
              // 重新加载当前页
              this.loadFavoriteQuestions(this.data.favoritePage)
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

  // 练习收藏题目
  practiceFavorite(e) {
    const question = e.currentTarget.dataset.question
    wx.navigateTo({
      url: `/pages/favorite-practice/favorite-practice?ids=${question.question_id}`
    })
  },

  onShareAppMessage() {
    return {
      title: '复习中心 - 袋鼠数学助理',
      path: '/pages/review/review'
    }
  }
})