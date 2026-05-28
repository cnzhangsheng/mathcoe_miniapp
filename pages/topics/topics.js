// pages/topics/topics.js - 100%复刻 kangaroo-math-brain
const userService = require('../../services/user')
const questionService = require('../../services/question')
const practiceService = require('../../services/practice')
const cache = require('../../services/cache')
const { getTopicTitle, getTopicClass } = require('../../services/topics')
const { IMAGE_BASE_URL } = require('../../utils/constants')

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    activeTab: 'all',
    imageBaseUrl: IMAGE_BASE_URL,

    // 专题数据（静态数据作为 fallback，实际从 API 获取）
    topics: [],
    filteredTopics: [],

    // AI学习洞察数据
    insightData: { weakest_topic_title: '', progress_gain: 0, analysis_base: 0 },

    // 推荐题目列表
    recommendQuestions: [],
    recommendLoading: false,
    recommendTopicTitle: ''
  },

  onLoad() {
    this.checkLoginStatus()
    this.filterTopics()
    this.loadTopics()
    if (this.data.isLoggedIn) {
      this.loadRecommendQuestions()
    }
  },

  onShow() {
    const wasLoggedIn = this.data.isLoggedIn
    this.checkLoginStatus()
    // 登录状态从未登录→已登录时，加载推荐题目
    if (!wasLoggedIn && this.data.isLoggedIn) {
      this.loadRecommendQuestions()
    } else if (this.data.isLoggedIn) {
      // 已登录用户回到页面时刷新推荐题目（可能在其他页面修改了等级等设置）
      this.loadRecommendQuestions()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    this.setData({ isLoggedIn: !!token })
  },

  // 跳转登录页，登录后回到本页
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=topics' })
  },

  // 推荐题目：分析薄弱专题，推荐10道题目
  async goToRecommend(e) {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login?redirect=topics' })
      return
    }

    // 从点击的卡片获取起始索引，没有则从0开始
    const startIndex = e?.currentTarget?.dataset?.index ?? -1

    // 已有推荐题目数据，直接跳转练习
    if (this.data.recommendQuestions.length > 0) {
      const questionIds = this.data.recommendQuestions.map(q => q.id).join(',')
      let url = `/pages/review-practice/review-practice?ids=${questionIds}&title=${encodeURIComponent('推荐题目练习')}&source=topics`
      if (startIndex >= 0) url += `&startIndex=${startIndex}`
      wx.navigateTo({ url })
      return
    }

    // 无推荐数据时重新加载
    await this.loadRecommendQuestions()
    if (this.data.recommendQuestions.length > 0) {
      const questionIds = this.data.recommendQuestions.map(q => q.id).join(',')
      let url = `/pages/review-practice/review-practice?ids=${questionIds}&title=${encodeURIComponent('推荐题目练习')}&source=topics`
      if (startIndex >= 0) url += `&startIndex=${startIndex}`
      wx.navigateTo({ url })
    }
  },

  // 加载推荐题目列表
  async loadRecommendQuestions() {
    if (this.data.recommendLoading) return
    this.setData({ recommendLoading: true })
    try {
      const questions = await questionService.getRecommendedQuestions(10)

      if (questions && questions.length > 0) {
        // 构建专题名称映射
        const topicMap = {}
        this.data.topics.forEach(t => { topicMap[t.id] = t.title })
        this.setData({
          recommendQuestions: questions.map(q => ({
            ...q,
            topicTitle: topicMap[q.topic_id] || '',
            topicClass: getTopicClass(q.topic_id)
          })),
          recommendTopicTitle: topicMap[questions[0].topic_id] || '',
        })
      } else {
        this.setData({ recommendQuestions: [], recommendTopicTitle: '' })
      }
    } catch (err) {
      console.error('loadRecommendQuestions error:', err)
      this.setData({ recommendQuestions: [] })
    } finally {
      this.setData({ recommendLoading: false })
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    const tasks = [this.loadTopics()]
    if (this.data.isLoggedIn) {
      tasks.push(this.loadRecommendQuestions())
    }
    await Promise.all(tasks)
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多（已无数据需要加载）
  onReachBottom() {
  },

  // 筛选专题
  filterTopics() {
    const { topics, activeTab } = this.data
    let filtered = topics
    if (activeTab === 'high') {
      filtered = topics.filter(t => t.isHighFreq)
    }
    this.setData({ filteredTopics: filtered })
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.filterTopics()
  },

  async loadTopics() {
    // 显示缓存数据
    const cached = cache.get('topics')
    if (cached) {
      this.setData({ topics: cached })
      this.filterTopics()
    }
    try {
      const fetchers = [questionService.getTopics().catch(() => null)]
      if (this.data.isLoggedIn) {
        fetchers.push(userService.getUserInsight().catch(() => null))
      }
      const results = await Promise.all(fetchers)
      const topics = results[0]
      const insight = results.length > 1 ? results[1] : null

      if (insight) {
        this.setData({ insightData: insight })
      }

      if (topics && topics.length > 0) {
        const topicsWithProgress = topics.map(topic => {
          const bgClass = `bg-${topic.color || 'blue'}`
          const progressClass = `progress-${topic.color || 'blue'}`
          const cardBgClass = `card-bg-${topic.color || 'blue'}`
          return {
            ...topic,
            progress: 0,
            successRate: 0,
            questionsDone: 0,
            bgClass,
            progressClass,
            cardBgClass,
            iconEmoji: this.getIconEmoji(topic.icon || topic.title),
            iconImage: this.getTopicIconImage(topic.icon || topic.title),
            isHighFreq: topic.is_high_freq || false
          }
        })
        cache.set('topics', topicsWithProgress, 300000) // 缓存 5 分钟
        this.setData({ topics: topicsWithProgress })
        this.filterTopics()
      }
      this.setData({ loading: false })
    } catch (err) {
      console.error('loadTopics error:', err)
      this.setData({ loading: false })
    }
  },

  // 获取图标emoji
  getIconEmoji(iconOrTitle) {
    const iconMap = {
      'Calculator': '🧮',
      'Brain': '🧠',
      'Columns': '📐',
      'Eye': '👁',
      'ShoppingBag': '🛒',
      '算术': '🧮',
      '逻辑': '🧠',
      '几何': '📐',
      '规律': '👁',
      '应用': '🛒'
    }
    // 根据图标名或标题关键词匹配
    for (const key in iconMap) {
      if (iconOrTitle && iconOrTitle.includes(key)) {
        return iconMap[key]
      }
    }
    return '📚'
  },

  // 获取专题自定义图标
  getTopicIconImage(iconOrTitle) {
    const iconMap = [
      { keywords: ['几何', 'Columns', '图形', '空间'], image: IMAGE_BASE_URL + 'icons/tuxing_icon.png' },
      { keywords: ['逻辑', 'Brain', '数理'], image: IMAGE_BASE_URL + 'icons/shuliluoji_icon.png' },
      { keywords: ['应用', 'ShoppingBag', '综合'], image: IMAGE_BASE_URL + 'icons/yingyong_icon.png' },
      { keywords: ['算术', 'Calculator', '运算', '计算'], image: IMAGE_BASE_URL + 'icons/yunsuan_icon.png' },
    ]
    for (const entry of iconMap) {
      for (const keyword of entry.keywords) {
        if (iconOrTitle.includes(keyword)) {
          return entry.image
        }
      }
    }
    return null
  },

  // 选择专题 - 进入题目详情页面
  selectTopic(e) {
    const topicId = e.currentTarget.dataset.id
    const topic = this.data.topics.find(t => t.id === topicId)
    const title = encodeURIComponent(topic.title || '专题详情')
    wx.navigateTo({
      url: `/pages/topic-question-detail/topic-question-detail?topic_id=${topicId}&title=${title}`
    })
  },

  // 错题溯源
  goErrors() {
    wx.showToast({ title: '错题溯源功能开发中', icon: 'none' })
  },

  // 知识微课
  goCheatSheet() {
    wx.showToast({ title: '知识微课功能开发中', icon: 'none' })
  },

  // 成就页面
  goAchievement() {
    wx.showToast({ title: '成就功能开发中', icon: 'none' })
  },
})
