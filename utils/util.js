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

module.exports = {
  formatTime,
  formatDate
}