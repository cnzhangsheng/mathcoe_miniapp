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
    const fullUrl = app.globalData.baseUrl + url

    console.log(`[API Request] ${options.method || 'GET'} ${url}`, options.data || {})

    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 30000,  // 30秒超时
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        console.log(`[API Response] ${url}: ${Date.now() - startTime}ms, status=${res.statusCode}`)
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // Token过期，清除登录状态
          console.warn('[API Error] Token expired')
          wx.removeStorageSync('token')
          app.globalData.token = null
          app.globalData.isLoggedIn = false
          resolve(null)
        } else if (res.statusCode === 500) {
          // 服务端错误 - 详细输出
          console.error('========================================')
          console.error('[API Error 500] Server Internal Error')
          console.error('URL:', url)
          console.error('Method:', options.method || 'GET')
          console.error('Request Data:', options.data || {})
          console.error('Response:', res.data)
          console.error('Detail:', res.data?.detail || res.data?.message || 'Unknown error')
          console.error('========================================')
          resolve(null)
        } else if (res.statusCode === 404) {
          console.error('[API Error 404] Not Found:', url)
          resolve(null)
        } else if (res.statusCode === 400) {
          console.error('[API Error 400] Bad Request')
          console.error('URL:', url)
          console.error('Request Data:', options.data || {})
          console.error('Response:', res.data)
          resolve(null)
        } else {
          console.error(`[API Error ${res.statusCode}]`, url, res.data)
          resolve(null)
        }
      },
      fail: (err) => {
        console.error('[API Network Error]', url, err.errMsg || err)
        resolve(null)
      }
    })
  })
}

module.exports = {
  request
}