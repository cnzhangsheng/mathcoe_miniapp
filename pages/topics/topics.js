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

    // 考卷数据
    examPapers: [],

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

  onShow() {
    // 每次切到此tab时刷新考卷列表，避免新增的考卷不显示
    this.loadExamPapers()
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
  async loadExamPapers() {
    try {
      const allPapers = await examPaperService.getExamPapers().catch(() => [])

      if (allPapers && allPapers.length > 0) {
        const papersWithType = allPapers.map(paper => {
          const typeInfo = this.data.paperTypes[paper.paper_type] || this.data.paperTypes.daily
          return {
            ...paper,
            typeLabel: typeInfo.label,
            typeIcon: typeInfo.icon,
            typeColor: typeInfo.color,
            duration: 75
          }
        })

        this.setData({
          examPapers: papersWithType,
          totalExamPapers: papersWithType.length
        })
      } else {
        this.setData({
          examPapers: [],
          totalExamPapers: 0
        })
      }
    } catch (err) {
      console.error('loadExamPapers error:', err)
    }
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

  // 导出考卷 PDF
  async downloadPdf(e) {
    const paperId = e.currentTarget.dataset.id

    wx.showLoading({ title: '正在下载PDF...', mask: true })

    try {
      const url = examPaperService.getDownloadPdfUrl(paperId)
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url,
          timeout: 120000,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '下载失败')),
        })
      })

      if (downloadResult.statusCode !== 200) {
        throw new Error('下载失败')
      }

      await new Promise((resolve, reject) => {
        wx.openDocument({
          filePath: downloadResult.tempFilePath,
          showMenu: true,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '打开失败')),
        })
      })
    } catch (err) {
      console.error('downloadPdf error:', err)
      wx.showToast({ title: '导出失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
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
