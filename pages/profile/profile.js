// pages/profile/profile.js - 100%复刻 Me.tsx
const app = getApp()

Page({
  data: {
    userInfo: null,
    stats: [
      { label: '错题本', value: '📚', page: '/pages/review/review' },
      { label: '收藏夹', value: '⭐', page: '/pages/favorites/favorites' }
    ],
    selectedGrade: '三年级',
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    gradeIndex: 2,
    calendarDays: [],
    medals: [
      { unlocked: true, level: 'L2', title: '初级关口' },
      { unlocked: true, level: null, title: '几何大师' },
      { unlocked: false, level: null, title: '锁定中' },
      { unlocked: false, level: null, title: '锁定中' }
    ],
    certificates: [
      { title: '2024 L2 全真模考高分证', level: '优秀' },
      { title: '逻辑专题训练思维勋章', level: '专业' }
    ],
    showSettings: false,
    dailyGoal: 10,
    showHints: true,
    examPressure: false,
    loading: true
  },

  onLoad() {
    this.initCalendar()
    // 优先从 globalData 获取年级信息
    if (app.globalData.userInfo?.grade) {
      const grade = app.globalData.userInfo.grade
      const gradeIndex = parseInt(grade.replace('G', '')) - 1
      this.setData({
        gradeIndex,
        selectedGrade: this.data.grades[gradeIndex],
        userInfo: app.globalData.userInfo
      })
    }
    this.loadUserInfo()
  },

  initCalendar() {
    const activeDays = [2, 5, 8, 12, 15, 18, 20, 22]
    const days = []
    for (let i = 1; i <= 28; i++) {
      days.push({
        day: i,
        active: activeDays.includes(i - 1)
      })
    }
    this.setData({ calendarDays: days })
  },

  async loadUserInfo() {
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        this.setData({ loading: false })
        return
      }

      wx.request({
        url: app.globalData.baseUrl + '/users/me',
        header: { 'Authorization': `Bearer ${token}` },
        success: (res) => {
          if (res.data) {
            // 存入 globalData
            app.globalData.userInfo = res.data
            // 根据 grade 设置 gradeIndex
            if (res.data.grade) {
              const gradeIndex = parseInt(res.data.grade.replace('G', '')) - 1
              this.setData({
                userInfo: res.data,
                gradeIndex,
                selectedGrade: this.data.grades[gradeIndex],
                loading: false
              })
            } else {
              this.setData({
                userInfo: res.data,
                loading: false
              })
            }
          } else {
            this.setData({ loading: false })
          }
        },
        fail: () => {
          this.setData({ loading: false })
        }
      })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  updateGrade(grade) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: app.globalData.baseUrl + '/users/me',
        method: 'PATCH',
        header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
        data: { grade },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(res)
          }
        },
        fail: reject
      })
    })
  },

  onGradeChange(e) {
    const newIndex = e.detail.value
    const oldIndex = this.data.gradeIndex
    const oldGrade = this.data.selectedGrade

    // 先更新本地状态
    this.setData({
      gradeIndex: newIndex,
      selectedGrade: this.data.grades[newIndex]
    })

    // 计算 grade 值 (G1-G6)
    const grade = `G${parseInt(newIndex) + 1}`

    // 调用 API 保存
    this.updateGrade(grade)
      .then(() => {
        // 成功后更新 globalData
        if (app.globalData.userInfo) {
          app.globalData.userInfo.grade = grade
        }
        wx.showToast({ title: '保存成功', icon: 'success' })
      })
      .catch(() => {
        // 失败时回滚本地状态
        this.setData({
          gradeIndex: oldIndex,
          selectedGrade: oldGrade
        })
        wx.showToast({ title: '保存失败', icon: 'error' })
      })
  },

  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },

  goToFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  goToReview() {
    wx.switchTab({ url: '/pages/review/review' })
  },

  goToStat(e) {
    const page = e.currentTarget.dataset.page
    if (page === '/pages/review/review') {
      wx.switchTab({ url: page })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  openSettings() {
    this.setData({ showSettings: true })
  },

  closeSettings() {
    this.setData({ showSettings: false })
  },

  setDailyGoal(goal) {
    this.setData({ dailyGoal: goal })
  },

  toggleHints() {
    this.setData({ showHints: !this.data.showHints })
  },

  togglePressure() {
    this.setData({ examPressure: !this.data.examPressure })
  },

  saveSettings() {
    this.setData({ showSettings: false })
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userId')
          app.globalData.isLoggedIn = false
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  }
})