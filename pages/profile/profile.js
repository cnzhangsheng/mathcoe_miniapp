// pages/profile/profile.js - 我的页面（设置页面）
const app = getApp()
const { IMAGE_BASE_URL, DIFFICULTY_LEVELS } = require('../../utils/constants')
const userService = require('../../services/user')

function formatNum(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    userInfo: null,
    streakDays: 0,
    imageBaseUrl: IMAGE_BASE_URL,

    // 年级
    gradeLabels: [
      { value: 'G1', label: '一年级'},
      { value: 'G2', label: '二年级'},
      { value: 'G3', label: '三年级'},
      { value: 'G4', label: '四年级'},
      { value: 'G5', label: '五年级'},
      { value: 'G6', label: '六年级'}
    ],
    gradeIndex: 2,

    // 难度等级
    difficultyLabels: DIFFICULTY_LEVELS,
    difficultyLevel: 1,

    // 学习统计
    stats: null,
    statsDisplay: { total: '-', rate: '-', month_total: '-', correct_wrong: '-/-', total_wrong: '-', fav: '-' },

    // 设置
    dailyGoal: 12,
    showGoalPicker: false,
    showGradePicker: false,
    showDifficultyPicker: false,

    // 昵称编辑
    showNicknameEdit: false,
    nicknameInput: ''
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadData()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadData()
    }
  },

  async onPullDownRefresh() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      await this.loadData()
    }
    wx.stopPullDownRefresh()
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    this.setData({ isLoggedIn: !!token })
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
          dailyGoal: userInfo.daily_goal || 12,
          difficultyLevel: userInfo.difficulty_level || 1
        })
      }

      // 加载学习统计
      const stats = await userService.getUserStats().catch(() => null)
      if (stats) {
        const s = userInfo?.streak_days || 0
        this.setData({
          stats,
          'statsDisplay.total': formatNum(stats.total_questions),
          'statsDisplay.rate': stats.correct_rate + '%',
          'statsDisplay.month_total': formatNum(stats.month_total_questions),
          'statsDisplay.correct_wrong': formatNum(stats.correct_count) + '/' + formatNum(stats.wrong_count),
          'statsDisplay.total_wrong': formatNum(stats.total_wrong_count),
          'statsDisplay.fav': formatNum(stats.favorite_count),
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

  // 难度等级选择
  openDifficultyPicker() {
    this.setData({ showDifficultyPicker: true })
  },

  closeDifficultyPicker() {
    this.setData({ showDifficultyPicker: false })
  },

  selectDifficulty(e) {
    const level = e.currentTarget.dataset.level
    this.updateDifficulty(level)
    this.closeDifficultyPicker()
  },

  async updateDifficulty(level) {
    try {
      await userService.updateUserInfo({ difficulty_level: level })
      this.setData({ difficultyLevel: level })
      if (app.globalData.userInfo) {
        app.globalData.userInfo.difficulty_level = level
      }
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  // ========== 昵称编辑 ==========

  openNicknameEdit() {
    this.setData({
      showNicknameEdit: true,
      nicknameInput: this.data.userInfo?.nickname || ''
    })
  },

  closeNicknameEdit() {
    this.setData({ showNicknameEdit: false })
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  async saveNickname() {
    const nickname = this.data.nicknameInput.trim()
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }

    try {
      await userService.updateUserInfo({ nickname })
      this.setData({
        'userInfo.nickname': nickname,
        showNicknameEdit: false
      })
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickname = nickname
      }
      wx.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  // 跳转登录页
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login?redirect=profile' })
  },

  // 意见反馈
  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  // 答题记录
  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },

  // 头像加载失败时使用默认头像
  onAvatarError() {
    const { userInfo } = this.data
    if (userInfo && userInfo.avatar_url) {
      this.setData({ 'userInfo.avatar_url': null })
    }
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
      title: '小学数学思维',
      path: '/pages/index/index'
    }
  }
})