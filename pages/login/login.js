// pages/login/login.js - 授权登录页面
const app = getApp()
const { IMAGE_BASE_URL } = require('../../utils/constants')

Page({
  data: {
    loading: false,
    isLoggedIn: false,
    redirect: '',
    imageBaseUrl: IMAGE_BASE_URL,
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    gradeIndex: 0,  // 默认一年级（G1）
    difficultyLevel: 1,
    difficultyLabels: [
      { value: 1, label: 'Level 1', hint: '建议一、二年级选择' },
      { value: 2, label: 'Level 2', hint: '建议三、四年级选择' },
      { value: 3, label: 'Level 3', hint: '建议五、六年级选择' },
    ],
    showGradePicker: false,
    showDifficultyPicker: false,
    agreed: false,  // 隐私协议是否同意
    showAgreementModal: false,  // 温馨提示弹窗
  },

  onLoad(options) {
    this.setData({ redirect: options.redirect || '' })
    // 检查是否已经登录
    const token = wx.getStorageSync('token')
    if (token) {
      this.setData({ isLoggedIn: true })
      // 已登录，根据 redirect 参数跳转
      if (this.data.redirect) {
        wx.switchTab({ url: '/pages/' + this.data.redirect + '/' + this.data.redirect })
      } else {
        wx.switchTab({ url: '/pages/index/index' })
      }
    }
  },

  // 微信授权登录
  handleLogin() {
    if (this.data.loading) return

    if (!this.data.agreed) {
      this.setData({ showAgreementModal: true })
      return
    }

    this.setData({ loading: true })
    this.wxLogin()
  },

  // 温馨提示 - 同意
  onAgreementConfirm() {
    this.setData({ agreed: true, showAgreementModal: false })
    this.setData({ loading: true })
    this.wxLogin()
  },

  // 温馨提示 - 不同意
  onAgreementCancel() {
    this.setData({ showAgreementModal: false })
  },

  // 微信登录
  wxLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.loginWithCode(res.code)
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
  loginWithCode(code) {
    wx.request({
      url: app.globalData.baseUrl + '/auth/wx-login',
      method: 'POST',
      data: {
        code,
        grade: "G" + (this.data.gradeIndex + 1),
        difficulty_level: this.data.difficultyLevel
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

          // 根据 redirect 参数跳转，无则跳首页
          setTimeout(() => {
            if (this.data.redirect) {
              const decoded = decodeURIComponent(this.data.redirect)
              if (decoded.startsWith('/')) {
                wx.redirectTo({ url: decoded })
              } else {
                wx.switchTab({ url: '/pages/' + decoded + '/' + decoded })
              }
            } else {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
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

  // 年级弹窗
  openGradePicker() {
    this.setData({ showGradePicker: true })
  },

  closeGradePicker() {
    this.setData({ showGradePicker: false })
  },

  selectGrade(e) {
    const gradeIndex = parseInt(e.currentTarget.dataset.index)
    // G1-G2 → Level 1, G3-G4 → Level 2, G5-G6 → Level 3
    const defaultLevel = gradeIndex < 2 ? 1 : gradeIndex < 4 ? 2 : 3
    this.setData({ gradeIndex, difficultyLevel: defaultLevel, showGradePicker: false })
  },

  // 难度等级弹窗
  openDifficultyPicker() {
    this.setData({ showDifficultyPicker: true })
  },

  closeDifficultyPicker() {
    this.setData({ showDifficultyPicker: false })
  },

  selectDifficulty(e) {
    const level = e.currentTarget.dataset.level
    this.setData({ difficultyLevel: level, showDifficultyPicker: false })
  },

  // 隐私协议勾选状态变化
  onAgreementChange() {
    this.setData({ agreed: !this.data.agreed })
  },

  // 查看用户服务协议
  onTapUserService() {
    wx.navigateTo({
      url: '/pages/content/content?slug=user-agreement'
    })
  },

  // 查看隐私政策
  onTapPrivacy() {
    wx.navigateTo({
      url: '/pages/content/content?slug=privacy-policy'
    })
  }
})