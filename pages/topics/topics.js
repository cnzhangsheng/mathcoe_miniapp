// pages/topics/topics.js - 100%复刻 kangaroo-math-brain
const userService = require('../../services/user')
const questionService = require('../../services/question')
const examPaperService = require('../../services/examPaper')

Page({
  data: {
    loading: true,
    activeTab: 'all',
    selectedExamPaper: null,

    // 专题数据（静态数据作为 fallback，实际从 API 获取）
    topics: [],

    filteredTopics: [],

    // 知识点分布
    knowledgeItems: [
      { label: '数字敏感度', val: 90, color: 'knowledge-emerald' },
      { label: '空间思维', val: 45, color: 'knowledge-amber' },
      { label: '逻辑链推导', val: 65, color: 'knowledge-indigo' }
    ],

    // 考卷数据
    examPapers: [],
    examPapersPage: 1,
    examPapersPageSize: 10,
    totalExamPapers: 0,
    hasMoreExamPapers: true,
    examPapersLoading: false,

    // AI学习洞察数据
    insightData: null,

    paperTypes: {
      daily: { label: '每日一练', icon: '📅', color: 'emerald' },
      mock: { label: '模拟卷', icon: '📝', color: 'amber' },
      topic: { label: '专项训练', icon: '🎯', color: 'purple' }
    }
  },

  onLoad() {
    this.filterTopics()
    this.loadTopics()
    this.loadExamPapers()
  },

  // 下拉加载更多考卷
  onReachBottom() {
    if (this.data.hasMoreExamPapers && !this.data.examPapersLoading) {
      this.loadMoreExamPapers()
    }
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
    try {
      const [topics, insight] = await Promise.all([
        questionService.getTopics().catch(() => null),
        userService.getUserInsight().catch(() => null),
      ])

      if (insight && insight.analysis_base > 0) {
        this.setData({ insightData: insight })
      }

      if (topics && topics.length > 0) {
        const topicsWithProgress = topics.map(topic => {
          const bgClass = `bg-${topic.color || 'blue'}`
          const progressClass = `progress-${topic.color || 'blue'}`
          return {
            ...topic,
            progress: 0,
            successRate: 0,
            questionsDone: 0,
            bgClass,
            progressClass,
            iconEmoji: this.getIconEmoji(topic.icon || topic.title),
            isHighFreq: topic.is_high_freq || false
          }
        })
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

  // 加载考卷列表
  async loadExamPapers(isLoadMore = false) {
    if (this.data.examPapersLoading) return

    this.setData({ examPapersLoading: true })

    try {
      const { examPapersPage, examPapersPageSize, examPapers } = this.data
      const page = isLoadMore ? examPapersPage + 1 : 1

      const allPapers = await examPaperService.getExamPapers().catch(() => [])

      if (allPapers && allPapers.length > 0) {
        const papersWithType = allPapers.map((paper, index) => {
          const typeInfo = this.data.paperTypes[paper.paper_type] || this.data.paperTypes.daily
          return {
            ...paper,
            typeLabel: typeInfo.label,
            typeIcon: typeInfo.icon,
            typeColor: typeInfo.color,
            isNew: index < 2,
            year: 2024,
            duration: 75
          }
        })

        const startIndex = (page - 1) * examPapersPageSize
        const endIndex = startIndex + examPapersPageSize
        const newPapers = papersWithType.slice(startIndex, endIndex)
        const total = papersWithType.length
        const hasMore = endIndex < total

        this.setData({
          examPapers: isLoadMore ? [...examPapers, ...newPapers] : newPapers,
          examPapersPage: page,
          totalExamPapers: total,
          hasMoreExamPapers: hasMore,
          examPapersLoading: false
        })
      } else {
        this.setData({
          examPapers: [],
          hasMoreExamPapers: false,
          examPapersLoading: false
        })
      }
    } catch (err) {
      console.error('loadExamPapers error:', err)
      this.setData({ examPapersLoading: false })
    }
  },

  // 加载更多考卷
  loadMoreExamPapers() {
    this.loadExamPapers(true)
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

  // 选择考卷 - 进入考试页面
  selectExamPaper(e) {
    const paperId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/practice/practice?exam_paper_id=${paperId}`
    })
  },

  // 加载考卷详情（保留但不使用）
  async loadExamPaperDetail(paperId) {
    try {
      const detail = await examPaperService.getExamPaper(paperId)
      if (detail) {
        this.setData({ selectedExamPaper: detail })
      }
    } catch (err) {
      console.error('loadExamPaperDetail error:', err)
    }
  },

  // 关闭考卷详情（保留但不使用）
  closeExamPaperDetail() {
    this.setData({ selectedExamPaper: null })
  },

  // 开始考卷练习（保留但不使用）
  startExamPaperPractice() {
    const paperId = this.data.selectedExamPaper.id
    this.setData({ selectedExamPaper: null })
    wx.navigateTo({
      url: `/pages/practice/practice?exam_paper_id=${paperId}`
    })
  },

  preventClose() {
    // 阻止点击内容区域关闭
  }
})