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
    filterTopics: [{ id: 0, title: '全部', icon: '📚' }],

    // 专题分组
    topicGroups: [],

    // 错题列表（分页）
    wrongQuestions: [],
    wrongPage: 1,
    wrongPageSize: 10,
    wrongHasMore: true,
    wrongLoading: false,

    // 最近错题（首页展示）
    recentWrongQuestions: [],

    // 收藏列表（分页）
    favoriteQuestions: [],
    favoritePage: 1,
    favoritePageSize: 10,
    favoriteHasMore: true,
    favoriteLoading: false,

    // 全部收藏（用于分页）
    allFavoriteQuestions: [],

    // 全部错题（用于统计和分组）
    allWrongQuestions: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 每次显示时重新加载数据
    this.loadData()
  },

  // 下拉加载更多
  onReachBottom() {
    if (this.data.activeTab === 'wrong' && this.data.wrongHasMore && !this.data.wrongLoading) {
      this.loadMoreWrongQuestions()
    } else if (this.data.activeTab === 'favorite' && this.data.favoriteHasMore && !this.data.favoriteLoading) {
      this.loadMoreFavoriteQuestions()
    }
  },

  async loadData() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.hideLoading()
        this.setData({ loading: false })
        return
      }

      // 并行加载专题、错题和收藏
      const [topics, wrongQuestions, favoriteQuestions] = await Promise.all([
        reviewService.getTopics().catch(() => []),
        reviewService.getWrongQuestions().catch(() => []),
        reviewService.getFavorites().catch(() => [])
      ])

      // 构建筛选专题列表 - 使用真实专题数据
      const filterTopics = [
        { id: 0, title: '全部', icon: '📚' },
        ...(topics || []).map(t => ({
          id: t.id,
          title: t.title,
          icon: t.icon || '📝'
        }))
      ]

      // 处理错题数据
      const processedWrong = this.processWrongQuestions(wrongQuestions || [])

      // 处理收藏数据
      const processedFavorites = this.processFavoriteQuestions(favoriteQuestions || [])

      // 统计
      const pendingWrongCount = processedWrong.length
      const favoriteCount = processedFavorites.length

      // 根据筛选过滤错题
      let filteredWrong = processedWrong
      if (this.data.selectedTopicId > 0) {
        filteredWrong = processedWrong.filter(q => parseInt(q.topic_id) === this.data.selectedTopicId)
      }

      // 按时间排序
      const sortedWrong = filteredWrong.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // 分页加载第一页错题
      const firstWrongPage = sortedWrong.slice(0, this.data.wrongPageSize)
      const wrongHasMore = sortedWrong.length > this.data.wrongPageSize

      // 收藏数据按时间排序
      const sortedFavorites = processedFavorites.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // 分页加载第一页收藏
      const firstFavoritePage = sortedFavorites.slice(0, this.data.favoritePageSize)
      const favoriteHasMore = sortedFavorites.length > this.data.favoritePageSize

      this.setData({
        loading: false,
        allWrongQuestions: processedWrong,
        allFavoriteQuestions: processedFavorites,
        pendingWrongCount,
        favoriteCount,
        filterTopics,
        wrongQuestions: firstWrongPage,
        wrongPage: 1,
        wrongHasMore: wrongHasMore,
        recentWrongQuestions: firstWrongPage.slice(0, 5),
        favoriteQuestions: firstFavoritePage,
        favoritePage: 1,
        favoriteHasMore: favoriteHasMore
      })

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  // 加载更多错题
  loadMoreWrongQuestions() {
    if (!this.data.wrongHasMore || this.data.wrongLoading) return

    this.setData({ wrongLoading: true })

    // 根据筛选过滤错题
    let filteredWrong = this.data.allWrongQuestions
    if (this.data.selectedTopicId > 0) {
      filteredWrong = this.data.allWrongQuestions.filter(q => parseInt(q.topic_id) === this.data.selectedTopicId)
    }

    // 按时间排序
    const sortedWrong = filteredWrong.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const nextPage = this.data.wrongPage + 1
    const startIndex = (nextPage - 1) * this.data.wrongPageSize
    const endIndex = startIndex + this.data.wrongPageSize
    const newQuestions = sortedWrong.slice(startIndex, endIndex)

    this.setData({
      wrongQuestions: [...this.data.wrongQuestions, ...newQuestions],
      wrongPage: nextPage,
      wrongHasMore: endIndex < sortedWrong.length,
      wrongLoading: false
    })
  },

  // 加载更多收藏
  loadMoreFavoriteQuestions() {
    if (!this.data.favoriteHasMore || this.data.favoriteLoading) return

    this.setData({ favoriteLoading: true })

    // 按时间排序
    const sortedFavorites = this.data.allFavoriteQuestions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const nextPage = this.data.favoritePage + 1
    const startIndex = (nextPage - 1) * this.data.favoritePageSize
    const endIndex = startIndex + this.data.favoritePageSize
    const newQuestions = sortedFavorites.slice(startIndex, endIndex)

    this.setData({
      favoriteQuestions: [...this.data.favoriteQuestions, ...newQuestions],
      favoritePage: nextPage,
      favoriteHasMore: endIndex < sortedFavorites.length,
      favoriteLoading: false
    })
  },

  // 处理错题数据
  processWrongQuestions(questions) {
    return questions.map(q => {
      // 转换 options 格式: [{label: 'A', text: '内容'}] -> [{key: 'A', value: '内容'}]
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
        dateLabel: this.getDateLabel(q.created_at)
      }
    })
  },

  // 处理收藏数据
  processFavoriteQuestions(questions) {
    return questions.map(q => {
      // 转换 options 格式
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
        explanation: q.question_explanation?.text || ''
      }
    })
  },

  // 按专题分组
  groupByTopic(questions) {
    const topicIcons = {
      1: { icon: '🔢', iconClass: 'blue-bg', title: '算术与计数' },
      2: { icon: '🧩', iconClass: 'purple-bg', title: '逻辑与推理' },
      3: { icon: '📐', iconClass: 'green-bg', title: '几何与空间' },
      4: { icon: '🔍', iconClass: 'amber-bg', title: '规律与观察' },
      5: { icon: '📖', iconClass: 'rose-bg', title: '综合应用题' }
    }

    const groups = {}
    questions.forEach(q => {
      const topicId = q.topic_id || 0
      if (!groups[topicId]) {
        groups[topicId] = {
          topic_id: topicId,
          topic_title: q.topicTitle || topicIcons[topicId]?.title || '其他',
          icon: topicIcons[topicId]?.icon || '📝',
          iconClass: topicIcons[topicId]?.iconClass || 'gray-bg',
          count: 0,
          questions: []
        }
      }
      groups[topicId].count++
      groups[topicId].questions.push(q)
    })

    // 转换为数组并按错题数量排序
    return Object.values(groups)
      .filter(g => g.topic_id > 0)
      .sort((a, b) => b.count - a.count)
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
  getDateLabel(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const formatDate = d => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`

    if (formatDate(date) === formatDate(today)) return '今天'
    if (formatDate(date) === formatDate(yesterday)) return '昨天'
    return `${date.getMonth()+1}/${date.getDate()}`
  },

  // Tab切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 专题筛选
  selectTopic(e) {
    const topicId = parseInt(e.currentTarget.dataset.id) || 0
    this.setData({ selectedTopicId: topicId })

    // 根据筛选重新过滤错题
    let filteredWrong = this.data.allWrongQuestions
    if (topicId > 0) {
      filteredWrong = this.data.allWrongQuestions.filter(q => parseInt(q.topic_id) === topicId)
    }

    // 按时间排序
    const sortedWrong = filteredWrong.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // 重置分页，显示第一页
    const firstPage = sortedWrong.slice(0, this.data.wrongPageSize)
    const hasMore = sortedWrong.length > this.data.wrongPageSize

    this.setData({
      wrongQuestions: firstPage,
      wrongPage: 1,
      wrongHasMore: hasMore,
      recentWrongQuestions: firstPage.slice(0, 5)
    })
  },

  // 开始复习（根据筛选专题复习）
  startReview() {
    // 获取当前筛选的错题
    let filteredWrong = this.data.allWrongQuestions
    if (this.data.selectedTopicId > 0) {
      filteredWrong = this.data.allWrongQuestions.filter(q => parseInt(q.topic_id) === this.data.selectedTopicId)
    }

    if (filteredWrong.length === 0) {
      wx.showToast({ title: '没有错题', icon: 'none' })
      return
    }

    // 随机抽取最多10题
    const shuffled = filteredWrong.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 10)

    // 构建答题卡数据并跳转到练习页面，传递专题 ID
    const questionIds = selected.map(q => q.question_id)
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
              this.loadData()
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
              this.loadData()
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