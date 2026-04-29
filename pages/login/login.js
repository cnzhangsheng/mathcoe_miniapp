// pages/login/login.js - 授权登录页面
const app = getApp()

// 开发环境测试 token（仅用于真机调试测试）
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNjg5MzY5MzEzMjgiLCJleHAiOjE4MDg1Mzg3MTR9.Fs1uGh0mzR4Qq9iGZ5gdffF6hkWCk87WcrEsqXBOzuI'
const DEV_USER_ID = '168936931328'

Page({
  data: {
    loading: false,
    isLoggedIn: false,
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    gradeIndex: 0,  // 默认一年级（G1）
    difficultyLevels: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'],
    difficultyIndex: 0,  // 默认Level 1（根据年级自动计算）
    isDevMode: false  // 开发模式标记
  },

  onLoad() {
    // 检查是否已经登录
    const token = wx.getStorageSync('token')
    if (token) {
      this.setData({ isLoggedIn: true })
      // 已登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 微信授权登录
  handleLogin(e) {
    if (this.data.loading) return

    const userInfo = e.detail.userInfo
    if (!userInfo) {
      wx.showToast({
        title: '授权失败',
        icon: 'error'
      })
      return
    }

    this.setData({ loading: true })
    this.wxLogin(userInfo)
  },

  // 微信登录
  wxLogin(userInfo) {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.loginWithCode(res.code, userInfo)
        } else {
          console.error('wx.login failed:', res.errMsg)
          this.setData({ loading: false })
          wx.showToast({ title: '登录失败', icon: 'error' })
        }
      },
      fail: (err) => {
        console.error('wx.login failed:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '登录失败', icon: 'error' })
      }
    })
  },

  // 发送 code 到后端登录
  loginWithCode(code, userInfo) {
    // 微信默认昵称"微信用户"不使用，让后端设置默认昵称"数学小达人"
    const nickname = userInfo.nickName === '微信用户' ? null : userInfo.nickName
    wx.request({
      url: app.globalData.baseUrl + '/auth/wx-login',
      method: 'POST',
      data: {
        code,
        nickname,
        avatar_url: userInfo.avatarUrl,
        grade: "G" + (this.data.gradeIndex + 1),
        difficulty_level: this.data.difficultyIndex + 1
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.token) {
          // 存储 token 和用户信息
          wx.setStorageSync('token', res.data.token)
          wx.setStorageSync('userId', res.data.user_id)
          wx.setStorageSync('openid', res.data.openid)

          // 更新全局数据
          app.globalData.token = res.data.token
          app.globalData.userInfo = {
            id: res.data.user_id,
            openid: res.data.openid,
            nickname: res.data.nickname,
            avatar_url: res.data.avatar_url,
            grade: res.data.grade
          }
          app.globalData.isLoggedIn = true

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          // 跳转到首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        } else {
          wx.showToast({
            title: res.data?.detail || '登录失败',
            icon: 'error'
          })
        }
        this.setData({ loading: false })
      },
      fail: (err) => {
        console.error('Login request failed:', err)
        this.setData({ loading: false })
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        })
      }
    })
  },

  // 年级选择变化
  onGradeChange(e) {
    const gradeIndex = parseInt(e.detail.value)
    // G1-G2 → Lv.1, G3-G4 → Lv.2, G5-G6 → Lv.3
    const defaultDifficulty = gradeIndex < 2 ? 0 : gradeIndex < 4 ? 1 : 2
    this.setData({
      gradeIndex,
      difficultyIndex: defaultDifficulty
    })
  },

  // 难度等级选择变化
  onDifficultyChange(e) {
    this.setData({ difficultyIndex: parseInt(e.detail.value) })
  }
})