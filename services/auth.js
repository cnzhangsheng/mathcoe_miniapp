// services/auth.js - 认证服务
const app = getApp()
const { request } = require('./api')

/**
 * 微信登录
 * @param {string} code - wx.login()获取的code
 */
const wxLogin = (code) => {
  return request('/auth/wx-login', {
    method: 'POST',
    data: { code }
  })
}

/**
 * 静默续期 — 遇到 401 时自动调用 wx.login() 重新获取 token
 * 不需要用户交互，完全静默完成
 * @returns {Promise<string|null>} 新token，失败返回null
 */
const silentRefresh = () => {
  return new Promise((resolve) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: app.globalData.baseUrl + '/auth/wx-login',
            method: 'POST',
            data: { code: res.code },
            success: (resp) => {
              if (resp.statusCode === 200 && resp.data && resp.data.token) {
                const newToken = resp.data.token
                wx.setStorageSync('token', newToken)
                wx.setStorageSync('userId', resp.data.user_id)
                wx.setStorageSync('openid', resp.data.openid)
                app.globalData.token = newToken
                app.globalData.isLoggedIn = true
                resolve(newToken)
              } else {
                console.warn('[Auth] Silent refresh failed:', resp.data)
                resolve(null)
              }
            },
            fail: (err) => {
              console.warn('[Auth] Silent refresh network error:', err)
              resolve(null)
            }
          })
        } else {
          console.warn('[Auth] wx.login failed:', res.errMsg)
          resolve(null)
        }
      },
      fail: (err) => {
        console.warn('[Auth] wx.login error:', err)
        resolve(null)
      }
    })
  })
}

module.exports = {
  wxLogin,
  silentRefresh,
  refreshToken
}