// services/auth.js - 认证服务
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
 * 刷新token
 */
const refreshToken = () => {
  return request('/auth/refresh', {
    method: 'POST'
  })
}

module.exports = {
  wxLogin,
  refreshToken
}