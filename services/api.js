// services/api.js - API请求封装
const app = getApp()

// 是否正在静默续期 — 防止并发重复调用
let isRefreshing = false

/**
 * 处理 401 — 静默续期后重试，失败则跳转登录页
 */
const handle401 = (url, options, resolve) => {
  // 辅助请求（点赞状态等）静默降级，不干扰用户
  if (options.silent) {
    console.warn('[API 401 ignored]', url)
    resolve(null)
    return
  }

  // 已经是续期后的重试请求，仍然 401 → 不再循环
  if (options._isRetry) {
    console.warn('[API Error] Token refresh failed, redirecting to login')
    wx.removeStorageSync('token')
    app.globalData.token = null
    app.globalData.isLoggedIn = false
    resolve(null)
    wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
    setTimeout(() => {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage && currentPage.route !== 'pages/login/login') {
        wx.reLaunch({ url: '/pages/login/login' })
      }
    }, 1500)
    return
  }

  // 防止并发续期
  if (isRefreshing) {
    resolve(null)
    return
  }

  isRefreshing = true
  console.warn('[API 401] Token expired, attempting silent refresh...')

  // 清除旧 token
  wx.removeStorageSync('token')
  app.globalData.token = null
  app.globalData.isLoggedIn = false

  // 静默调用 wx.login() 换取新 token
  wx.login({
    success: (res) => {
      if (!res.code) {
        console.warn('[API] wx.login failed:', res.errMsg)
        isRefreshing = false
        resolve(null)
        wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
        setTimeout(() => {
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          if (currentPage && currentPage.route !== 'pages/login/login') {
            wx.reLaunch({ url: '/pages/login/login' })
          }
        }, 1500)
        return
      }

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
            isRefreshing = false
            console.log('[API] Silent refresh success, retrying:', url)

            // 用新 token 重试原始请求
            request(url, { ...options, _isRetry: true }).then(resolve)
          } else {
            isRefreshing = false
            console.warn('[API] Silent refresh failed:', resp.data)
            resolve(null)
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
            setTimeout(() => {
              const pages = getCurrentPages()
              const currentPage = pages[pages.length - 1]
              if (currentPage && currentPage.route !== 'pages/login/login') {
                wx.reLaunch({ url: '/pages/login/login' })
              }
            }, 1500)
          }
        },
        fail: (err) => {
          isRefreshing = false
          console.warn('[API] Silent refresh network error:', err)
          resolve(null)
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 2000 })
          setTimeout(() => {
            const pages = getCurrentPages()
            const currentPage = pages[pages.length - 1]
            if (currentPage && currentPage.route !== 'pages/login/login') {
              wx.reLaunch({ url: '/pages/login/login' })
            }
          }, 1500)
        }
      })
    },
    fail: (err) => {
      isRefreshing = false
      console.warn('[API] wx.login error:', err)
      resolve(null)
      wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
      setTimeout(() => {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage && currentPage.route !== 'pages/login/login') {
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }, 1500)
    }
  })
}

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
          handle401(url, options, resolve)
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