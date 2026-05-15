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
    totalExamPapers: 0,
    examPage: 1,
    examPageSize: 20,
    hasMore: false,

    // 考卷类型筛选
    selectedPaperType: '',
    paperTypeTabs: [
      { value: '', label: '全部' },
      { value: 'daily', label: '日常练习' },
      { value: 'mock', label: '模拟卷' },
      { value: 'topic', label: '专题训练' },
      { value: 'past', label: '真题卷' },
    ],

    // AI学习洞察数据
    insightData: null,

    paperTypes: {
      daily: { label: '日常练习', icon: '/assets/icons/icon-exam-daily.png', color: 'emerald' },
      mock: { label: '模拟卷', icon: '/assets/icons/icon-exam-sim.png', color: 'amber' },
      topic: { label: '专题训练', icon: '/assets/icons/icon-exam-topic.png', color: 'purple' },
      past: { label: '真题卷', icon: '/assets/icons/icon-exam-past.png', color: 'blue' }
    }
  },

  onLoad() {
    this.filterTopics()
    this.loadTopics()
    this.loadExamPapers()
  },

  onShow() {
    // 每次切到此tab时刷新考卷列表
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
      { keywords: ['几何', 'Columns', '图形', '空间'], image: '/assets/icons/tuxing_icon.png' },
      { keywords: ['逻辑', 'Brain', '数理'], image: '/assets/icons/shuliluoji_icon.png' },
      { keywords: ['应用', 'ShoppingBag', '综合'], image: '/assets/icons/yingyong_icon.png' },
      { keywords: ['算术', 'Calculator', '运算', '计算'], image: '/assets/icons/yunsuan_icon.png' },
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

  // 加载考卷列表（分页）
  async loadExamPapers(reset = true) {
    try {
      if (reset) {
        this.setData({ examPage: 1 })
      }
      const { examPage, examPageSize, selectedPaperType } = this.data
      const result = await examPaperService.getExamPapers({
        page: examPage,
        page_size: examPageSize,
        paper_type: selectedPaperType || undefined
      }).catch(() => null)

      if (result && result.items && result.items.length > 0) {
        const papersWithType = result.items.map(paper => {
          const typeInfo = this.data.paperTypes[paper.paper_type] || this.data.paperTypes.daily
          return {
            ...paper,
            is_new: paper.is_new === true,
            typeLabel: typeInfo.label,
            typeIcon: typeInfo.icon,
            typeColor: typeInfo.color,
            duration: 75
          }
        })

        this.setData({
          examPapers: reset ? papersWithType : [...this.data.examPapers, ...papersWithType],
          totalExamPapers: result.total,
          hasMore: result.total > (reset ? papersWithType.length : this.data.examPapers.length + papersWithType.length)
        })
      } else {
        if (reset) {
          this.setData({ examPapers: [], totalExamPapers: 0, hasMore: false })
        }
      }
    } catch (err) {
      console.error('loadExamPapers error:', err)
    }
  },

  // 选择考卷类型筛选
  selectPaperType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.selectedPaperType) return
    this.setData({ selectedPaperType: type })
    this.loadExamPapers(true)
  },

  // 加载更多考卷
  loadMoreExamPapers() {
    if (!this.data.hasMore) return
    const nextPage = this.data.examPage + 1
    this.setData({ examPage: nextPage })
    this.loadExamPapers(false)
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
