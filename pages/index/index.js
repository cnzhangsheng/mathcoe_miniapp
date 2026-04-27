// pages/index/index.js - 新首页逻辑
const app = getApp()
const userService = require('../../services/user')
const examPaperService = require('../../services/examPaper')

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    userInfo: null,
    greetingText: '早安！',
    streakDays: 0,
    countdownDays: 158,

    // 今日目标
    dailyGoal: 10,
    todayDone: 0,
    goalProgress: 0,

    // 能力雷达（默认5个专题）
    abilities: [
      { label: '算术与计数', value: 0, barClass: 'bar-blue' },
      { label: '逻辑与推理', value: 0, barClass: 'bar-purple' },
      { label: '几何与空间', value: 0, barClass: 'bar-green' },
      { label: '规律与观察', value: 0, barClass: 'bar-amber' },
      { label: '综合应用题', value: 0, barClass: 'bar-rose' }
    ],
    abilityRank: 0,

    // 推荐考卷
    recommendedPapers: [],

    // 本周学习统计
    weekQuestions: 0,
    weekCorrectRate: 0,
    weekWrongCount: 0,
    weekRange: '',
    favoriteCount: 0,

    // 薄弱专题
    weakTopic: null
  },

  onLoad() {
    this.setGreeting()
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadTodayProgress()
    }
  },

  onReady() {
    // 页面渲染完成后绘制雷达图
    if (this.data.isLoggedIn && this.data.abilities) {
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
    this.loadData()
  },

  // 加载所有数据
  async loadData() {
    try {
      // 并行加载用户信息、考卷、进度、能力雷达
      const [userInfo, examPapers, progress, abilityRadar] = await Promise.all([
        userService.getUserInfo().catch(() => null),
        examPaperService.getExamPapers().catch(() => []),
        userService.getUserProgress().catch(() => []),
        userService.getAbilityRadar().catch(() => null)
      ])

      if (userInfo && userInfo.id) {
        this.setData({
          userInfo,
          streakDays: userInfo.streak_days || 0,
          dailyGoal: userInfo.daily_goal || 10
        })
        // 同步保存到本地
        wx.setStorageSync('dailyGoal', userInfo.daily_goal || 10)
      }

      // 处理考卷数据
      if (examPapers && examPapers.length > 0) {
        const grade = userInfo?.grade || 'G1'
        const userLevel = this.gradeToLevel(grade)

        // 根据年级筛选推荐考卷
        const recommended = examPapers
          .filter(p => p.level === userLevel)
          .slice(0, 2)
          .map(paper => ({
            ...paper,
            typeIcon: this.getPaperTypeIcon(paper.paper_type),
            typeClass: paper.paper_type || 'daily',
            levelLabel: paper.level,
            levelClass: `level-${paper.level}`,
            paperTypeLabel: this.getPaperTypeLabel(paper.paper_type)
          }))

        this.setData({ recommendedPapers: recommended })
      }

      // 处理能力雷达（直接使用后端返回的数据）
      if (abilityRadar && abilityRadar.abilities) {
        const abilities = abilityRadar.abilities.map(a => ({
          label: a.label,
          value: a.value || 0,
          barClass: this.getBarClass(a.value || 0)
        }))

        this.setData({
          abilities: abilities.length > 0 ? abilities : this.data.abilities,
          abilityRank: abilityRadar.overall_rank || 0
        })

        // 绘制雷达图（等待 DOM 更新）
        setTimeout(() => this.drawRadarChart(), 100)
      }

      // 处理进度数据 -> 找出最薄弱的专题
      if (progress && progress.length > 0) {
        const weakest = progress.reduce((min, p) => {
          const rate = p.success_rate || p.progress || 0
          return rate < (min.success_rate || min.progress || 100) ? p : min
        }, progress[0])

        if (weakest && weakest.success_rate < 100) {
          this.setData({
            weakTopic: {
              id: weakest.topic_id,
              title: weakest.topic_title || '该专题'
            }
          })
        }
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
  loadTodayProgress() {
    const dailyGoal = wx.getStorageSync('dailyGoal') || 10
    const todayKey = `todayDone_${new Date().toDateString()}`
    const todayDone = wx.getStorageSync(todayKey) || 0
    const goalProgress = Math.min(100, Math.round((todayDone / dailyGoal) * 100))

    this.setData({
      dailyGoal,
      todayDone,
      goalProgress
    })
  },

  // 加载统计数据（本周）
  async loadStats() {
    try {
      const stats = await userService.getUserStats().catch(() => null)

      if (stats && stats.week_start && stats.week_end) {
        this.setData({
          weekRange: `${stats.week_start} ~ ${stats.week_end}`,
          weekQuestions: stats.total_questions || 0,
          weekCorrectRate: stats.correct_rate || 0,
          weekWrongCount: stats.wrong_count || 0,
          favoriteCount: stats.favorite_count || 0
        })
      } else {
        // 使用本地存储的统计数据
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

        this.setData({
          weekRange,
          weekQuestions: totalQuestions,
          weekCorrectRate: correctRate,
          weekWrongCount: wrongCount,
          favoriteCount
        })
      }
    } catch (err) {
      console.error('Load stats failed:', err)
    }
  },

  // 年级转等级
  gradeToLevel(grade) {
    const gradeNum = parseInt(grade.replace('G', '')) || 1
    if (gradeNum <= 2) return 'A'
    if (gradeNum <= 4) return 'B'
    return 'C'
  },

  // 获取考卷类型图标
  getPaperTypeIcon(type) {
    const icons = {
      daily: '📅',
      mock: '📝',
      topic: '🎯'
    }
    return icons[type] || '📝'
  },

  // 获取考卷类型标签
  getPaperTypeLabel(type) {
    const labels = {
      daily: '每日练习',
      mock: '模拟考试',
      topic: '专项训练'
    }
    return labels[type] || '练习'
  },

  // 根据数值返回进度条颜色类
  getBarClass(value) {
    if (value >= 85) return 'bar-blue'
    if (value >= 70) return 'bar-purple'
    if (value >= 55) return 'bar-green'
    if (value >= 40) return 'bar-amber'
    return 'bar-rose'
  },

  // 绘制多边形雷达图（带标签）
  drawRadarChart() {
    const abilities = this.data.abilities
    if (!abilities || abilities.length < 5) return

    wx.createSelectorQuery()
      .select('#radarCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio || 2

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

        // 绘制背景五边形网格（5层）
        const layers = 5
        for (let layer = layers; layer >= 1; layer--) {
          const layerRadius = radius * (layer / layers)
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
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
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
          ctx.stroke()
        }

        // 计算数据点位置
        const dataPoints = []
        for (let i = 0; i < 5; i++) {
          const value = abilities[i]?.value || 0
          const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
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
        const valueFontSize = 10

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
          const valueText = `${p.value}%`

          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          // 标题（与 text-small 字体大小一致）
          ctx.font = `${titleFontSize}px sans-serif`
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
          ctx.fillText(label, labelX, labelY - 10)

          // 数值（稍小）
          ctx.font = `${valueFontSize}px sans-serif`
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.fillText(valueText, labelX, labelY + 9)
        })
      })
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
  goToExamPaper() {
    wx.switchTab({
      url: '/pages/topics/topics'
    })
  },

  // 选择考卷进入练习
  selectExamPaper(e) {
    const paperId = e.currentTarget.dataset.id
    wx.reLaunch({
      url: `/pages/practice/practice?exam_paper_id=${paperId}`
    })
  },

  // 跳转到薄弱专题详情
  goToTopicDetail(e) {
    const topicId = e.currentTarget.dataset.id
    const title = encodeURIComponent(this.data.weakTopic?.title || '专题详情')
    wx.navigateTo({
      url: `/pages/topic-question-detail/topic-question-detail?topic_id=${topicId}&title=${title}`
    })
  },

  // 跳转到登录页
  goToLogin() {
    wx.redirectTo({
      url: '/pages/login/login'
    })
  },

  // ========== 分享 ==========

  onShareAppMessage() {
    return {
      title: '袋鼠数学智练 - 每天10分钟，数学思维突飞猛进',
      path: '/pages/index/index'
    }
  }
})