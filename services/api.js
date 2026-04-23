// services/api.js - API请求封装
const app = getApp()

/**
 * 封装请求方法
 * @param {string} url - API路径（不含baseUrl）
 * @param {object} options - 请求选项
 * @returns {Promise}
 */
const request = (url, options = {}) => {
  const token = wx.getStorageSync('token') || app.globalData.token

  return new Promise((resolve, reject) => {
    // 未登录时，返回 null（需要登录的接口）
    if (!token) {
      resolve(null)
      return
    }

    wx.request({
      url: app.globalData.baseUrl + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // Token过期，清除登录状态
          console.log('Token expired')
          wx.removeStorageSync('token')
          app.globalData.token = null
          app.globalData.isLoggedIn = false
          resolve(null)
        } else if (res.statusCode === 500) {
          // 服务端错误
          console.log('Server error:', res.data)
          resolve(null)
        } else {
          reject(new Error(res.data?.detail || res.data?.message || 'Request failed'))
        }
      },
      fail: (err) => {
        console.log('Request failed:', err)
        resolve(null)
      }
    })
  })
}

module.exports = {
  request
}