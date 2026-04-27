// pages/profile/profile.js - 我的页面（设置页面）
const app = getApp()
const userService = require('../../services/user')

Page({
  data: {
    loading: true,
    userInfo: null,
    streakDays: 0,

    // 年级
    gradeLabels: [
      { value: 'G1', label: '一年级', desc: 'Level A' },
      { value: 'G2', label: '二年级', desc: 'Level A' },
      { value: 'G3', label: '三年级', desc: 'Level B' },
      { value: 'G4', label: '四年级', desc: 'Level B' },
      { value: 'G5', label: '五年级', desc: 'Level C' },
      { value: 'G6', label: '六年级', desc: 'Level C' }
    ],
    gradeIndex: 2,

    // 设置
    dailyGoal: 10,
    showGoalPicker: false,
    showGradePicker: false
  },

  onLoad() {
    this.loadData()
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

      // 加载用户信息
      const userInfo = await userService.getUserInfo().catch(() => null)

      if (userInfo) {
        const gradeIndex = this.getGradeIndex(userInfo.grade)
        this.setData({
          userInfo,
          gradeIndex,
          streakDays: userInfo.streak_days || 0,
          dailyGoal: userInfo.daily_goal || 10
        })
      }

      wx.hideLoading()
      this.setData({ loading: false })
    } catch (err) {
      wx.hideLoading()
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  getGradeIndex(grade) {
    if (!grade) return 2
    const num = parseInt(grade.replace('G', '')) || 1
    return Math.max(0, Math.min(5, num - 1))
  },

  // 年级选择
  selectGrade(e) {
    const newIndex = e.currentTarget.dataset.index
    this.updateGrade(newIndex)
    this.closeGradePicker()
  },

  async updateGrade(newIndex) {
    const grade = this.data.gradeLabels[newIndex].value

    try {
      await userService.updateUserInfo({ grade })
      this.setData({ gradeIndex: newIndex })
      if (app.globalData.userInfo) {
        app.globalData.userInfo.grade = grade
      }
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  openGradePicker() {
    this.setData({ showGradePicker: true })
  },

  closeGradePicker() {
    this.setData({ showGradePicker: false })
  },

  // 每日目标
  openGoalPicker() {
    this.setData({ showGoalPicker: true })
  },

  closeGoalPicker() {
    this.setData({ showGoalPicker: false })
  },

  async setDailyGoal(e) {
    const goal = e.currentTarget.dataset.goal

    try {
      await userService.updateUserInfo({ daily_goal: goal })
      this.setData({ dailyGoal: goal })
      wx.setStorageSync('dailyGoal', goal)  // 同时保存到本地
      this.closeGoalPicker()
      wx.showToast({ title: '已设置', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '设置失败', icon: 'none' })
    }
  },

  // 关于页面
  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          // 保留登录信息
          const token = wx.getStorageSync('token')
          const userId = wx.getStorageSync('userId')

          // 清除其他缓存
          wx.clearStorageSync()

          // 恢复登录信息
          if (token) wx.setStorageSync('token', token)
          if (userId) wx.setStorageSync('userId', userId)

          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          app.globalData.isLoggedIn = false
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '袋鼠数学智练',
      path: '/pages/index/index'
    }
  }
})