// utils/auth.js - 认证工具函数

/**
 * 检查是否已登录
 * @returns {boolean}
 */
const isLoggedIn = () => {
  return !!wx.getStorageSync('token')
}

/**
 * 获取 token
 * @returns {string|null}
 */
const getToken = () => {
  return wx.getStorageSync('token')
}

/**
 * 设置 token
 * @param {string} token
 */
const setToken = (token) => {
  wx.setStorageSync('token', token)
}

/**
 * 清除登录状态
 */
const clearAuth = () => {
  wx.removeStorageSync('token')
  wx.removeStorageSync('userId')
}

module.exports = {
  isLoggedIn,
  getToken,
  setToken,
  clearAuth
}