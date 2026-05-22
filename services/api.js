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
    const startTime = Date.now()
    const fullUrl = app.globalData.baseUrl + url

    console.log(`[API Request] ${options.method || 'GET'} ${url}`, options.data || {})

    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }

    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 30000,
      header,
      success: (res) => {
        console.log(`[API Response] ${url}: ${Date.now() - startTime}ms, status=${res.statusCode}`)
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          if (options.silent) {
            // 辅助请求（点赞状态等）静默降级，不干扰用户
            console.warn('[API 401 ignored]', url)
            resolve(null)
          } else {
            console.warn('[API Error] Token expired')
            wx.removeStorageSync('token')
            app.globalData.token = null
            app.globalData.isLoggedIn = false
            resolve(null)
            // 非静默请求 401 → token 过期，跳转登录
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
            setTimeout(() => {
              // 防止已在登录页时循环跳转
              const pages = getCurrentPages()
              const currentPage = pages[pages.length - 1]
              if (currentPage && currentPage.route !== 'pages/login/login') {
                wx.reLaunch({ url: '/pages/login/login' })
              }
            }, 1500)
          }
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
        } else if (res.statusCode === 422) {
          console.error('[API Error 422] Validation Error')
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