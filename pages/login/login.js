// pages/login/login.js - 授权登录页面
const app = getApp()

Page({
  data: {
    loading: false,
    isLoggedIn: false
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
    wx.request({
      url: app.globalData.baseUrl + '/auth/wx-login',
      method: 'POST',
      data: {
        code,
        nickname: userInfo.nickName,
        avatar_url: userInfo.avatarUrl
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
            nickname: res.data.nickname || userInfo.nickName,
            avatar_url: res.data.avatar_url || userInfo.avatarUrl
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

  // 游客模式（不登录）
  handleGuest() {
    // 游客模式跳转到专题页面（允许浏览）
    wx.switchTab({
      url: '/pages/topics/topics'
    })
  }
})