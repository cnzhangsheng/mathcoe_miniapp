// pages/index/index.js - 新首页逻辑
const app = getApp()
const { IMAGE_BASE_URL, formatDifficulty, DIFFICULTY_LEVELS } = require('../../utils/constants')
const userService = require('../../services/user')
const examPaperService = require('../../services/examPaper')
const practiceService = require('../../services/practice')
const cache = require('../../services/cache')
const { getBanners } = require('../../services/content')

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    userInfo: null,
    greetingText: '早安！',
    imageBaseUrl: IMAGE_BASE_URL,

    // 今日目标
    dailyGoal: 12,
    todayDone: 0,
    goalProgress: 0,
    pdfProgress: 0,

    // 能力雷达
    abilities: [
      { label: '运算类', value: 0, barClass: 'bar-orange' },
      { label: '数理逻辑', value: 0, barClass: 'bar-purple' },
      { label: '图形类', value: 0, barClass: 'bar-blue' },
      { label: '应用类', value: 0, barClass: 'bar-green' },
    ],

    // 我的考卷
    myPapers: [],

    // 数学考卷模块（参考专题页面）
    paperTab: 'kangaroo', // kangaroo | my
    examPapers: [],
    totalExamPapers: 0,
    examPage: 1,
    examPageSize: 10,
    examHasMore: false,
    examLoading: false,
    selectedPaperType: '',
    paperTypeTabs: [
      { value: '', label: '全部' },
      { value: 'past', label: '真题卷' },
      { value: 'topic', label: '专题卷' },
      { value: 'daily', label: '练习卷' },
    ],
    paperTypes: {
      daily: { label: '练习卷', icon: IMAGE_BASE_URL + 'icons/icon-exam-daily.png', color: 'emerald' },
      topic: { label: '专题卷', icon: IMAGE_BASE_URL + 'icons/icon-exam-topic.png', color: 'purple' },
      past: { label: '真题卷', icon: IMAGE_BASE_URL + 'icons/icon-exam-past.png', color: 'blue' },
      custom: { label: '自编卷', icon: IMAGE_BASE_URL + 'icons/icon-exam-topic.png', color: 'green' }
    },

    // 本周/本月学习统计
    weekQuestions: 0,
    weekCorrectRate: 0,
    weekWrongCount: 0,
    wrongCount: 0,
    weekRange: '',
    favoriteCount: 0,
    // 本月统计
    monthQuestions: 0,
    monthCorrectRate: 0,
    monthWrongCount: 0,
    monthRange: '',
    statsTab: 'week',  // week | month

    // Banner
    banners: [],
    bannerCurrent: 0,

    // 难度等级切换
    difficultyLevel: 1,
    difficultyLabels: [
      { value: 1, label: 'Level 1', hint: '建议一、二年级选择' },
      { value: 2, label: 'Level 2', hint: '建议三、四年级选择' },
      { value: 3, label: 'Level 3', hint: '建议五、六年级选择' },
    ],
    showDifficultyPicker: false,
  },

  onLoad() {
    this.setGreeting()
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示时刷新登录状态
    this.checkLoginStatus()

    // Banner 无需登录，无条件加载
    this.loadBanners()

    // 数学考卷（系统级，无需登录）
    this.loadExamPapers()

    // 日期范围（无需登录）
    this.setDefaultDateRanges()

    if (this.data.isLoggedIn) {
      // 先同步全局数据（个人页修改昵称后立即生效）
      this.syncGlobalUserInfo()
      this.loadData()
    }

    // 检查是否需要切换到我的考卷 tab（从生成考卷页跳转过来）
    const targetTab = getApp().globalData.indexPaperTab
    if (targetTab && targetTab !== this.data.paperTab) {
      getApp().globalData.indexPaperTab = null
      this.setData({ paperTab: targetTab })
    }
  },

  async onPullDownRefresh() {
    this.loadBanners()
    this.loadExamPapers()
    this.setDefaultDateRanges()
    if (this.data.isLoggedIn) {
      this.syncGlobalUserInfo()
      await this.loadData()
    }
    wx.stopPullDownRefresh()
  },

  onReady() {
    // 页面渲染完成后绘制雷达图
    if (this.data.abilities) {
      setTimeout(() => this.drawRadarChart(), 200)
    }
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早安！'
    if (hour >= 12 && hour < 18) {
      greeting = '午安！'
    } else if (hour >= 18) {
      greeting = '晚安！'
    }
    this.setData({ greetingText: greeting })
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')

    if (!token) {
      this.setData({ loading: false, isLoggedIn: false })
      return
    }

    this.setData({ isLoggedIn: true })
    // onShow 中会调用 loadData() 加载完整数据
  },

  // 同步全局用户数据到页面（确保个人页的修改即时生效）
  syncGlobalUserInfo() {
    const globalUser = app.globalData.userInfo
    if (globalUser && globalUser.nickname) {
      const current = this.data.userInfo || {}
      this.setData({ userInfo: { ...current, ...globalUser } })
    }
  },

  // 加载所有数据
  async loadData() {
    // 优先显示缓存数据
    const cachedRadar = cache.get('abilityRadar')
    if (cachedRadar) {
      this.setData({ abilities: cachedRadar })
      setTimeout(() => this.drawRadarChart(), 100)
    }
    const cachedPapers = cache.get('myPapers')
    if (cachedPapers) {
      this.setData({ myPapers: cachedPapers })
    }

    try {
      // 并行加载用户信息、我的考卷、能力雷达
      const [userInfo, myPapersResult, abilityRadar] = await Promise.all([
        userService.getUserInfo().catch(() => null),
        examPaperService.getMyPapers(1, 5).catch(() => null),
        userService.getAbilityRadar().catch(() => null)
      ])

      if (userInfo && userInfo.id) {
        this.setData({
          userInfo,
          dailyGoal: userInfo.daily_goal || 12,
          difficultyLevel: userInfo.difficulty_level || 1
        })
        // 同步到全局数据，保持各页一致
        if (app.globalData.userInfo) {
          app.globalData.userInfo = { ...app.globalData.userInfo, ...userInfo }
        }
        // 同步保存到本地
        wx.setStorageSync('dailyGoal', userInfo.daily_goal || 12)
      }

      // 处理我的考卷数据
      if (myPapersResult && myPapersResult.items) {
        if (myPapersResult.items.length > 0) {
          const formattedPapers = myPapersResult.items.map(paper => {
            return {
              ...paper,
              levelLabel: formatDifficulty(paper.difficulty_level),
              typeLabel: '自编卷',
            }
          })
          cache.set('myPapers', formattedPapers, 120000) // 缓存 2 分钟
          this.setData({ myPapers: formattedPapers })
        } else {
          cache.remove('myPapers')
          this.setData({ myPapers: [] })
        }
      }

      // 处理能力雷达（直接使用后端返回的数据）
      if (abilityRadar && abilityRadar.abilities) {
        const abilities = abilityRadar.abilities.map(a => ({
          label: a.label,
          value: a.value || 0,
          barClass: this.getBarClass(a.value || 0)
        }))

        this.setData({
          abilities: abilities.length > 0 ? abilities : this.data.abilities
        })
        if (abilities.length > 0) cache.set('abilityRadar', abilities, 300000) // 缓存 5 分钟

        // 绘制雷达图（等待 DOM 更新）
        setTimeout(() => this.drawRadarChart(), 100)
      }

      // 加载今日进度
      this.loadTodayProgress()

      // 加载统计数据
      this.loadStats()

      this.setData({ loading: false })
    } catch (err) {
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  // 加载今日进度
  async loadTodayProgress() {
    try {
      console.log('[loadTodayProgress] 开始请求今日统计...')
      const dailyGoal = wx.getStorageSync('dailyGoal') || 12

      // 从后端获取今日答题统计
      const todayStats = await practiceService.getTodayStats()
      console.log('[loadTodayProgress] API返回:', todayStats)

      if (todayStats) {
        const todayDone = todayStats.total || 0
        const goalProgress = Math.min(100, Math.round((todayDone / dailyGoal) * 100))

        this.setData({
          dailyGoal,
          todayDone,
          goalProgress
        })
      } else {
        // 如果后端不可用，使用本地存储
        console.log('[loadTodayProgress] API返回无效，使用本地存储')
        const todayKey = `todayDone_${new Date().toDateString()}`
        const todayDone = wx.getStorageSync(todayKey) || 0
        const goalProgress = Math.min(100, Math.round((todayDone / dailyGoal) * 100))

        this.setData({
          dailyGoal,
          todayDone,
          goalProgress
        })
      }
    } catch (err) {
      console.error('[loadTodayProgress] 请求失败:', err)
      // 使用本地存储作为备用
      const dailyGoal = wx.getStorageSync('dailyGoal') || 12
      const todayKey = `todayDone_${new Date().toDateString()}`
      const todayDone = wx.getStorageSync(todayKey) || 0
      const goalProgress = Math.min(100, Math.round((todayDone / dailyGoal) * 100))

      this.setData({
        dailyGoal,
        todayDone,
        goalProgress
      })
    }
  },

  // 加载统计数据（本周）
  async loadStats() {
    try {
      console.log('[loadStats] 开始请求用户统计数据...')
      const stats = await userService.getUserStats()
      console.log('[loadStats] API返回:', stats)

      if (stats && stats.week_start && stats.week_end) {
        console.log('[loadStats] 使用后端数据更新')
        this.setData({
          weekRange: `${stats.week_start} ~ ${stats.week_end}`,
          weekQuestions: stats.total_questions || 0,
          weekCorrectRate: stats.correct_rate || 0,
          weekWrongCount: stats.wrong_count || 0,
          favoriteCount: stats.favorite_count || 0,
          monthQuestions: stats.month_total_questions || 0,
          monthCorrectRate: stats.month_correct_rate || 0,
          monthWrongCount: stats.month_wrong_count || 0,
          monthRange: `${stats.month_start} ~ ${stats.month_end}`
        })
      } else {
        console.log('[loadStats] API返回无效，使用备用数据')
        const totalQuestions = wx.getStorageSync('totalQuestions') || 0
        const wrongCount = wx.getStorageSync('wrongCount') || 0
        const favoriteCount = wx.getStorageSync('favoriteCount') || 0
        const correctRate = totalQuestions > 0
          ? Math.round(((totalQuestions - wrongCount) / totalQuestions) * 100)
          : 0

        // 本周日期范围（本地计算）
        const now = new Date()
        const day = now.getDay() || 7
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - day + 1)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        const formatDate = (d) => `${d.getMonth() + 1}/${d.getDate()}`
        const weekRange = `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`

        // 本月范围（本地计算）
        const monthStart = `${now.getFullYear()}/${now.getMonth() + 1}/1`
        const monthEnd = `${now.getFullYear()}/${now.getMonth() + 1}/${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

        this.setData({
          weekRange,
          weekQuestions: totalQuestions,
          weekCorrectRate: correctRate,
          weekWrongCount: wrongCount,
          favoriteCount,
          monthQuestions: totalQuestions,
          monthCorrectRate: correctRate,
          monthWrongCount: wrongCount,
          monthRange: `${monthStart} ~ ${monthEnd}`
        })
      }
    } catch (err) {
      console.error('[loadStats] 请求失败:', err)
    }
  },

  // 切换本周/本月统计tab
  switchStatsTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab !== this.data.statsTab) {
      this.setData({ statsTab: tab })
    }
  },

  // 头像加载失败时使用默认头像
  onAvatarError() {
    const { userInfo } = this.data
    if (userInfo && userInfo.avatar_url) {
      this.setData({ 'userInfo.avatar_url': null })
    }
  },

  // 获取考卷类型图标
  getPaperTypeIcon(type) {
    const icons = {
      daily: IMAGE_BASE_URL + 'icons/icon-exam-daily.png',
      mock: IMAGE_BASE_URL + 'icons/icon-exam-sim.png',
      topic: IMAGE_BASE_URL + 'icons/icon-exam-topic.png',
      past: IMAGE_BASE_URL + 'icons/icon-exam-past.png'
    }
    return icons[type] || IMAGE_BASE_URL + 'icons/icon-exam-daily.png'
  },

  // 获取考卷类型标签
  getPaperTypeLabel(type) {
    const labels = {
      daily: '练习卷',
      mock: '模拟卷',
      topic: '专题卷',
      past: '真题卷'
    }
    return labels[type] || '练习'
  },

  // 根据数值返回进度条颜色类
  getBarClass(value) {
    if (value >= 85) return 'bar-blue'
    if (value >= 70) return 'bar-purple'
    if (value >= 55) return 'bar-green'
    return 'bar-orange'
  },

  // 绘制多边形雷达图（带标签）
  drawRadarChart() {
    const abilities = this.data.abilities
    if (!abilities || abilities.length === 0) return

    wx.createSelectorQuery()
      .select('#radarCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio || 2

        const displayWidth = res[0].width
        const displayHeight = res[0].height
        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr
        ctx.scale(dpr, dpr)

        const centerX = displayWidth / 2
        const centerY = displayHeight / 2
        const radius = Math.min(displayWidth, displayHeight) / 2 - 55

        ctx.clearRect(0, 0, displayWidth, displayHeight)

        // 配色方案：蓝绿渐变
        const primaryColor = '#10B981'   // 绿色
        const secondaryColor = '#6366F1' // 紫色

        const count = abilities.length

        // 绘制背景多边形网格（5层）
        const layers = 5
        for (let layer = layers; layer >= 1; layer--) {
          const layerRadius = radius * (layer / layers)
          ctx.beginPath()
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) - Math.PI / 2
            const x = centerX + layerRadius * Math.cos(angle)
            const y = centerY + layerRadius * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          // 渐变背景色
          const alpha = 0.015 + (layer - 1) * 0.02
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`
          ctx.fill()
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // 绘制轴线
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'
        ctx.lineWidth = 1
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i / count) - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
          ctx.stroke()
        }

        // 计算数据点位置
        const dataPoints = []
        for (let i = 0; i < count; i++) {
          const value = abilities[i]?.value || 0
          const angle = (Math.PI * 2 * i / count) - Math.PI / 2
          const dataRadius = radius * (value / 100)
          const x = centerX + dataRadius * Math.cos(angle)
          const y = centerY + dataRadius * Math.sin(angle)
          dataPoints.push({ x, y, value, angle })
        }

        // 绘制数据区域
        ctx.beginPath()
        dataPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.closePath()

        // 渐变填充：从中心到边缘
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.7)')   // 青色
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.5)') // 绿色
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.3)')  // 天蓝色
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 2.5
        ctx.stroke()

        // 绘制数据点和标签
        const labelRadius = radius + 32

        // 字体大小：与 text-small (24rpx ≈ 12px) 一致
        const titleFontSize = 12

        dataPoints.forEach((p, i) => {
          // 数据点
          ctx.beginPath()
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
          ctx.fillStyle = '#10B981'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()

          // 标签位置
          const labelX = centerX + labelRadius * Math.cos(p.angle)
          const labelY = centerY + labelRadius * Math.sin(p.angle)

          const label = abilities[i]?.label || ''

          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          // 只显示专题名称
          ctx.font = `${titleFontSize}px sans-serif`
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx.fillText(label, labelX, labelY)
        })
      })
  },

  // ========== 考卷模块 (数学考卷 + 我的考卷) ==========

  // 切换考卷 tab
  switchPaperTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.paperTab) return
    this.setData({ paperTab: tab, selectedPaperType: '' })
    if (tab === 'kangaroo' && this.data.examPapers.length === 0) {
      this.loadExamPapers(true)
    }
  },

  // 加载数学考卷列表
  async loadExamPapers(reset = true) {
    const { examPage, examPageSize, selectedPaperType, difficultyLevel } = this.data
    if (!reset && this.data.examLoading) return

    this.setData(reset ? { examPage: 1, examLoading: true } : { examLoading: true })
    try {
      const page = reset ? 1 : examPage
      const result = await examPaperService.getExamPapers({
        page,
        page_size: examPageSize,
        paper_type: selectedPaperType || undefined,
        difficulty_level: difficultyLevel
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
            difficultyLabel: paper.difficulty_level ? formatDifficulty(paper.difficulty_level) : '',
            duration: 75
          }
        })

        const totalLoaded = reset ? papersWithType.length : this.data.examPapers.length + papersWithType.length
        this.setData({
          examPapers: reset ? papersWithType : [...this.data.examPapers, ...papersWithType],
          totalExamPapers: result.total,
          examHasMore: result.total > totalLoaded,
          examPage: page,
        })
      } else {
        if (reset) this.setData({ examPapers: [], totalExamPapers: 0, examHasMore: false })
      }
    } catch (err) {
      console.error('loadExamPapers error:', err)
    } finally {
      this.setData({ examLoading: false })
    }
  },

  // 加载更多数学考卷
  loadMoreExamPapers() {
    if (!this.data.examHasMore || this.data.examLoading) return
    const nextPage = this.data.examPage + 1
    this.setData({ examPage: nextPage })
    this.loadExamPapers(false)
  },

  // 难度等级弹窗
  openDifficultyPicker() {
    this.setData({ showDifficultyPicker: true })
  },

  closeDifficultyPicker() {
    this.setData({ showDifficultyPicker: false })
  },

  async selectDifficulty(e) {
    const level = e.currentTarget.dataset.level
    this.setData({ difficultyLevel: level, showDifficultyPicker: false })
    if (this.data.isLoggedIn) {
      try {
        await userService.updateUserInfo({ difficulty_level: level })
        if (app.globalData.userInfo) {
          app.globalData.userInfo.difficulty_level = level
        }
      } catch (err) {
        console.error('selectDifficulty error:', err)
      }
    }
    this.loadExamPapers(true)
  },

  // 考卷类型筛选
  selectPaperType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.selectedPaperType) return
    this.setData({ selectedPaperType: type })
    this.loadExamPapers(true)
  },

  // ========== 导航方法 ==========

  // 跳转到探索页
  goToDiscover() {
    wx.switchTab({
      url: '/pages/discover/discover'
    })
  },

  // 跳转到专题页
  goToTopics() {
    wx.switchTab({
      url: '/pages/topics/topics'
    })
  },

  // 跳转到错题本
  goToReview() {
    wx.switchTab({
      url: '/pages/review/review'
    })
  },

  // 跳转到个人页
  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 跳转到考卷列表
  goToGeneratePaper() {
    wx.navigateTo({ url: '/pages/generate-paper/generate-paper' })
  },

  goToExamPaper() {
    wx.switchTab({
      url: '/pages/topics/topics'
    })
  },

  // 选择考卷进入练习
  selectExamPaper(e) {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const paperId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/practice/practice?exam_paper_id=${paperId}`
    })
  },

  // 下载PDF
  async downloadPdf(e) {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const paperId = e.currentTarget.dataset.id
    this.setData({ pdfProgress: -1 })
    try {
      // 检查服务端是否已生成 PDF
      const status = await examPaperService.checkPdfStatus(paperId)
      if (!status) {
        // 考卷不存在（已被删除），从列表中移除
        const myPapers = this.data.myPapers.filter(p => p.id !== paperId)
        this.setData({ myPapers })
        cache.remove('myPapers')
        throw new Error('考卷已删除')
      }
      if (!status.exists) {
        // 未生成，先触发服务端生成
        await examPaperService.generatePdf(paperId)
      }
      // 切换到下载阶段，立即显示进度条
      this.setData({ pdfProgress: 1 })
      // 下载已生成的文件
      const filePath = await examPaperService.downloadPdfWithProgress(paperId, (progress) => {
        this.setData({ pdfProgress: progress })
      })
      this.setData({ pdfProgress: 100 })
      await new Promise((resolve, reject) => {
        wx.openDocument({
          filePath,
          showMenu: true,
          success: resolve,
          fail: (err) => reject(new Error(err.errMsg || '打开失败')),
        })
      })
      // 下载成功后刷新列表，更新 file_path 状态
      this.loadData()
    } catch (err) {
      console.error('downloadPdf error:', err)
      if (err.message === '考卷已删除') {
        wx.showToast({ title: '考卷已删除', icon: 'none' })
      } else {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    } finally {
      this.setData({ pdfProgress: 0 })
    }
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
            this.loadData()
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

  // AI 智能组卷点击：未登录跳转登录，登录后正常进入
  handleGenerateTap() {
    if (this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/generate-paper/generate-paper' })
    } else {
      wx.navigateTo({ url: '/pages/login/login' })
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.redirectTo({
      url: '/pages/login/login'
    })
  },

  // ========== Banner ==========

  // 设置默认日期范围（使用与后端一致的 YYYY-MM-DD 格式）
  setDefaultDateRanges() {
    if (this.data.weekRange && this.data.monthRange) return
    const now = new Date()
    const day = now.getDay() || 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const weekRange = `${fmt(weekStart)} ~ ${fmt(weekEnd)}`
    const monthRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 ~ ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`
    this.setData({ weekRange, monthRange })
  },

  async loadBanners() {
    try {
      const banners = await getBanners()
      if (banners && banners.length > 0) {
        this.setData({ banners })
      }
    } catch (err) {
      console.error('loadBanners error:', err)
    }
  },

  onBannerChange(e) {
    this.setData({ bannerCurrent: e.detail.current })
  },

  onBannerTap(e) {
    const index = e.currentTarget?.dataset?.index ?? this.data.bannerCurrent
    const banner = this.data.banners[index]
    if (!banner) return

    if (banner.link_type === 'content') {
      wx.navigateTo({ url: `/pages/content/content?slug=${banner.link_value}` })
    } else if (banner.link_type === 'external' && banner.link_value) {
      wx.navigateTo({ url: `/pages/webview/webview?url=${encodeURIComponent(banner.link_value)}` })
    }
  },

  // ========== 分享 ==========

  onShareAppMessage() {
    return {
      title: '小学数学思维 - 每天10分钟，数学思维突飞猛进',
      path: '/pages/index/index'
    }
  }
})