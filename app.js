// app.js
const { BASE_URL, API_BASE_URL, IMAGE_BASE_URL, CONTENT_BASE_URL } = require('./utils/constants')

App({
  globalData: {
    userInfo: null,
    token: null,
    BASE_URL,
    API_BASE_URL,
    baseUrl: API_BASE_URL,           // 兼容旧代码，指向 API_BASE_URL
    isLoggedIn: false,
    imageBaseUrl: IMAGE_BASE_URL,
    contentBaseUrl: CONTENT_BASE_URL,
  },

  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示时检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.globalData.isLoggedIn = true
    } else {
      this.globalData.isLoggedIn = false
      this.globalData.token = null
    }
  },

  // 清除登录状态
  clearLoginStatus() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('token')
    wx.removeStorageSync('userId')
    wx.removeStorageSync('openid')
  },

  // 设置登录状态
  setLoginStatus(token, userInfo) {
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    wx.setStorageSync('token', token)
    wx.setStorageSync('userId', userInfo.id)
  },

  // 微信登录
  wxLogin(callback) {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到后端换取 token
          wx.request({
            url: this.globalData.API_BASE_URL + '/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.statusCode === 200 && loginRes.data.token) {
                this.setLoginStatus(loginRes.data.token, loginRes.data.user)
                callback && callback(true, loginRes.data)
              } else {
                console.error('Login failed:', loginRes.data)
                callback && callback(false, loginRes.data)
              }
            },
            fail: (err) => {
              console.error('Login request failed:', err)
              callback && callback(false, err)
            }
          })
        } else {
          console.error('wx.login failed:', res.errMsg)
          callback && callback(false, res)
        }
      },
      fail: (err) => {
        console.error('wx.login failed:', err)
        callback && callback(false, err)
      }
    })
  }
})