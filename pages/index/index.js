// pages/index/index.js - 首页，检查登录状态
const userService = require('../../services/user')

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    userInfo: null,
    streakDays: 5,
    countdownDays: 158,
    abilityRank: 82,
    lastLoginAt: '',  // 最后登录时间

    // 能力雷达数据
    abilities: [
      { label: '逻辑推理', value: 85, barClass: 'bar-blue' },
      { label: '空间想象', value: 60, barClass: 'bar-purple' },
      { label: '算术应用', value: 75, barClass: 'bar-green' },
      { label: '规律总结', value: 90, barClass: 'bar-amber' }
    ],

    // 提分秘籍
    expertTips: [
      { title: '图形观察', desc: '旋转视角找突破口', icon: '👁', bgClass: 'tip-bg-indigo' },
      { title: '逆向思维', desc: '从答案反推过程', icon: '🔄', bgClass: 'tip-bg-rose' },
      { title: '排除法', desc: '快速锁定正确区域', icon: '🔍', bgClass: 'tip-bg-emerald' }
    ],

    // 历年真题
    pastExams: [
      { year: 2024, title: '2024 真题', difficulty: 'L1-2' },
      { year: 2023, title: '2023 真题', difficulty: 'L1-2' },
      { year: 2022, title: '2022 真题', difficulty: 'L1-2' },
      { year: 2021, title: '2021 真题', difficulty: 'L1-2' }
    ],

    // 错题数量
    wrongCount: 12
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示时检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const app = getApp()

    if (!token) {
      // 未登录，跳转到登录页面
      this.setData({ loading: false, isLoggedIn: false })
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    // 已登录，加载用户数据
    this.setData({ isLoggedIn: true })
    this.loadData()
  },

  async loadData() {
    try {
      const userInfo = await userService.getUserInfo()

      if (userInfo && userInfo.id) {
        // 格式化最后登录时间
        const lastLoginAt = this.formatLoginTime(userInfo.last_login_at)

        this.setData({
          userInfo,
          streakDays: userInfo.streak_days || 5,
          lastLoginAt,
          loading: false
        })

        // 加载能力雷达
        const abilityRadar = await userService.getAbilityRadar().catch(() => null)
        if (abilityRadar && abilityRadar.abilities) {
          const abilities = abilityRadar.abilities.map(a => ({
            label: a.label,
            value: a.value,
            barClass: this.getBarClass(a.value)
          }))
          this.setData({
            abilities,
            abilityRank: abilityRadar.overall_rank || 82
          })
        }
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  // 格式化登录时间
  formatLoginTime(timeStr) {
    if (!timeStr) return '首次登录'

    try {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date

      // 一小时内
      if (diff < 3600000) {
        return '刚刚登录'
      }
      // 今天
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `${hours}小时前登录`
      }
      // 昨天
      const yesterday = new Date(now - 86400000)
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天登录'
      }
      // 其他日期
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hour = date.getHours()
      const minute = date.getMinutes()
      return `${month}/${day} ${hour}:${minute.toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  },

  // 根据数值返回进度条颜色类
  getBarClass(value) {
    if (value >= 85) return 'bar-blue'
    if (value >= 70) return 'bar-purple'
    if (value >= 55) return 'bar-green'
    return 'bar-amber'
  },

  // 跳转到练习页面
  goToPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice'
    })
  },

  // 跳转到模考模式
  goToExam(e) {
    const year = e.currentTarget.dataset.year
    if (year) {
      wx.navigateTo({
        url: `/pages/practice/practice?mode=exam&year=${year}`
      })
    } else {
      wx.navigateTo({
        url: '/pages/practice/practice?mode=exam'
      })
    }
  },

  // 跳转到专题训练
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
  }
})