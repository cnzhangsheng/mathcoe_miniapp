// utils/util.js - 通用工具函数

/**
 * 格式化时间
 * @param {number} seconds - 秒数
 * @returns {string} - 格式化后的时间字符串
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期
 * @returns {string} - 格式化后的日期字符串
 */
const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

/**
 * 处理富文本中的图片，限制最大宽度防止溢出屏幕
 * 微信小程序 <rich-text> 不会应用外部 CSS，需要给 <img> 添加内联样式
 * @param {string} html - 原始 HTML
 * @returns {string} - 处理后的 HTML
 */
const processRichText = (html) => {
  if (!html || typeof html !== 'string') return html
  // 给所有 <img> 标签添加 max-width 和 height:auto 样式
  return html.replace(/<img\s/gi, '<img style="max-width:100%;height:auto;display:block" ')
}

/**
 * 从 HTML 中提取所有图片 URL
 * @param {string} html - HTML 字符串
 * @returns {string[]} 图片 URL 数组
 */
const extractImageUrls = (html) => {
  if (!html || typeof html !== 'string') return []
  const urls = []
  const regex = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1])
  }
  return urls
}

/**
 * 预加载图片 - 提取题目内容中的图片并提前下载到微信缓存
 * 用户切到题目时，图片直接从缓存加载，避免白屏等待
 * @param {string|string[]} htmlContents - HTML 内容或内容数组
 */
const preloadImages = (htmlContents) => {
  if (!htmlContents) return
  const contents = Array.isArray(htmlContents) ? htmlContents : [htmlContents]

  // 收集去重 URL
  const urlSet = new Set()
  contents.forEach(html => {
    extractImageUrls(html).forEach(url => urlSet.add(url))
  })

  // 静默预下载
  urlSet.forEach(url => {
    wx.getImageInfo({
      src: url,
      fail: () => {} // 预加载失败不影响主流程
    })
  })
}

module.exports = {
  formatTime,
  formatDate,
  processRichText,
  preloadImages,
}