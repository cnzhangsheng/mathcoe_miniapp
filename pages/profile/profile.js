// pages/profile/profile.js - 100%复刻 Me.tsx
const app = getApp()

Page({
  data: {
    userInfo: null,
    stats: [
      { label: '总答题', value: 342, color: 'blue' },
      { label: '正确率', value: '88%', color: 'green' },
      { label: '勋章数', value: 16, color: 'amber' }
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
            this.setData({
              userInfo: res.data,
              loading: false
            })
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

  onGradeChange(e) {
    const index = e.detail.value
    this.setData({
      gradeIndex: index,
      selectedGrade: this.data.grades[index]
    })
  },

  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },

  goToFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
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