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

    const startTime = Date.now()

    wx.request({
      url: app.globalData.baseUrl + url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 30000,  // 30秒超时
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        console.log(`API ${url}: ${Date.now() - startTime}ms, status=${res.statusCode}`)
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
          resolve(null)  // 其他错误也返回null，不reject
        }
      },
      fail: (err) => {
        console.log(`API ${url} failed:`, err.errMsg || err)
        resolve(null)  // 网络错误返回null，不reject
      }
    })
  })
}

module.exports = {
  request
}