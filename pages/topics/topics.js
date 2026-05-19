// pages/topics/topics.js - 100%复刻 kangaroo-math-brain
const userService = require('../../services/user')
const questionService = require('../../services/question')
const examPaperService = require('../../services/examPaper')
const cache = require('../../services/cache')

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

    // 考卷模块 tab
    paperTab: 'kangaroo', // kangaroo | my

    // 考卷类型筛选
    selectedPaperType: '',
    paperTypeTabs: [
      { value: '', label: '全部' },
      { value: 'daily', label: '日常练习' },
      { value: 'mock', label: '模拟卷' },
      { value: 'topic', label: '专题训练' },
      { value: 'past', label: '真题卷' },
    ],

    // 我的考卷数据
    myPapers: [],
    totalMyPapers: 0,
    myPapersPage: 1,
    myPapersPageSize: 20,
    myPapersHasMore: false,
    loadingMyPapers: false,
    generatingPdfIds: [],

    // AI学习洞察数据
    insightData: null,

    paperTypes: {
      daily: { label: '日常练习', icon: '/assets/icons/icon-exam-daily.png', color: 'emerald' },
      mock: { label: '模拟卷', icon: '/assets/icons/icon-exam-sim.png', color: 'amber' },
      topic: { label: '专题训练', icon: '/assets/icons/icon-exam-topic.png', color: 'purple' },
      past: { label: '真题卷', icon: '/assets/icons/icon-exam-past.png', color: 'blue' },
      custom: { label: '我的考卷', icon: '/assets/icons/icon-exam-topic.png', color: 'green' }
    }
  },

  onLoad() {
    this.filterTopics()
    this.loadTopics()
    this.loadExamPapers()
  },

  onShow() {
    // 每次切到此tab时刷新考卷列表
    if (this.data.paperTab === 'my') {
      this.loadMyPapers(true)
    } else {
      this.loadExamPapers()
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    const tasks = [this.loadTopics()]
    if (this.data.paperTab === 'my') {
      tasks.push(this.loadMyPapers(true))
    } else {
      tasks.push(this.loadExamPapers(true))
    }
    await Promise.all(tasks)
    wx.stopPullDownRefresh()
  },

  // 切换考卷模块 tab
  switchPaperTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.paperTab) return
    this.setData({ paperTab: tab, selectedPaperType: '' })
    if (tab === 'my') {
      this.loadMyPapers(true)
    } else {
      this.loadExamPapers(true)
    }
  },

  // 上拉加载更多考卷
  onReachBottom() {
    if (this.data.paperTab === 'my' && this.data.myPapersHasMore) {
      this.loadMoreMyPapers()
    } else if (this.data.hasMore) {
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
    // 显示缓存数据
    const cached = cache.get('topics')
    if (cached) {
      this.setData({ topics: cached })
      this.filterTopics()
    }
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
    // 显示缓存数据
    const cachedKey = 'examPapers_' + (this.data.selectedPaperType || 'all')
    const cached = cache.get(cachedKey)
    if (cached && reset) {
      this.setData({ examPapers: cached })
    }

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
        if (reset) cache.set(cachedKey, papersWithType, 120000) // 缓存 2 分钟
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

  // 加载我的考卷列表
  async loadMyPapers(reset = true) {
    if (this.data.loadingMyPapers) return
    this.setData({ loadingMyPapers: true })
    try {
      if (reset) this.setData({ myPapersPage: 1 })
      const { myPapersPage, myPapersPageSize } = this.data
      const result = await examPaperService.getMyPapers(myPapersPage, myPapersPageSize)
      if (result && result.items) {
        const generatingIds = this.data.generatingPdfIds
        const papers = result.items.map(paper => ({
          ...paper,
          typeLabel: '我的考卷',
          typeIcon: '/assets/icons/icon-exam-custom.png',
          typeColor: 'green',
          duration: 75,
          isGenerating: generatingIds.includes(paper.id),
        }))
        this.setData({
          myPapers: reset ? papers : [...this.data.myPapers, ...papers],
          totalMyPapers: result.total,
          myPapersHasMore: result.total > (reset ? papers.length : this.data.myPapers.length + papers.length)
        })
      } else {
        if (reset) this.setData({ myPapers: [], totalMyPapers: 0, myPapersHasMore: false })
      }
    } catch (err) {
      console.error('loadMyPapers error:', err)
    } finally {
      this.setData({ loadingMyPapers: false })
    }
  },

  // 加载更多我的考卷
  loadMoreMyPapers() {
    if (!this.data.myPapersHasMore || this.data.loadingMyPapers) return
    const nextPage = this.data.myPapersPage + 1
    this.setData({ myPapersPage: nextPage })
    this.loadMyPapers(false)
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
    const paper = this.data.examPapers.find(p => p.id === paperId) || this.data.myPapers.find(p => p.id === paperId)
    const fileName = (paper ? paper.title : `考卷_${paperId}`).replace(/[\\/:*?"<>|]/g, '_') + '.pdf'
    const filePath = wx.env.USER_DATA_PATH + '/' + fileName

    wx.showLoading({ title: '正在下载PDF...', mask: true })

    try {
      const url = examPaperService.getDownloadPdfUrl(paperId)
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url,
          filePath,
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
          filePath: downloadResult.filePath,
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

  // 生成 PDF
  async generatePdf(e) {
    const paperId = e.currentTarget.dataset.id
    const generatingIds = this.data.generatingPdfIds
    if (generatingIds.includes(paperId)) return
    this.setData({ generatingPdfIds: [...generatingIds, paperId] })
    this._updatePaperGenerating(paperId, true)
    try {
      const result = await examPaperService.generatePdf(paperId)
      if (result && result.file_path) {
        wx.showToast({ title: 'PDF 生成成功', icon: 'success' })
        this.loadMyPapers(true)
      } else {
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
    } catch (err) {
      console.error('generatePdf error:', err)
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    } finally {
      this.setData({
        generatingPdfIds: this.data.generatingPdfIds.filter(id => id !== paperId)
      })
      this._updatePaperGenerating(paperId, false)
    }
  },

  // 更新考卷列表中指定考卷的 isGenerating 状态
  _updatePaperGenerating(paperId, isGenerating) {
    const papers = this.data.myPapers
    const index = papers.findIndex(p => p.id === paperId)
    if (index === -1) return
    this.setData({ [`myPapers[${index}].isGenerating`]: isGenerating })
  },

  // 删除考卷
  deletePaper(e) {
    const paperId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除此考卷？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await examPaperService.deletePaper(paperId)
          if (result && result.ok) {
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadMyPapers(true)
          } else {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        } catch (err) {
          console.error('deletePaper error:', err)
          wx.showToast({ title: '删除失败，请重试', icon: 'none' })
        }
      }
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
  goToGeneratePaper() {
    wx.navigateTo({ url: '/pages/generate-paper/generate-paper' })
  },

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
