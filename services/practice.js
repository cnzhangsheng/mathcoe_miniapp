// services/practice.js - 练习服务
const { request } = require('./api')

/**
 * 开始练习
 * @param {object} data - 练习参数
 */
const startPractice = (data) => {
  return request('/practice/start', {
    method: 'POST',
    data
  })
}

/**
 * 提交答案
 * @param {object} data - 答案数据
 */
const submitAnswer = (data) => {
  return request('/practice/submit', {
    method: 'POST',
    data
  })
}

/**
 * 获取练习记录（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {object} filters - 筛选条件 { topicId, timeFilter, resultFilter }
 */
const getRecords = (page = 1, pageSize = 10, filters = {}) => {
  const params = { page, page_size: pageSize, detail: true }
  if (filters.topicId) params.topic_id = filters.topicId
  if (filters.timeFilter) params.time_filter = filters.timeFilter
  if (filters.resultFilter) params.result_filter = filters.resultFilter
  return request('/practice/records', { data: params })
}

/**
 * 获取收藏列表
 */
const getFavorites = () => {
  return request('/favorites')
}

/**
 * 添加收藏
 * @param {number} questionId
 */
const addFavorite = (questionId) => {
  return request('/favorites', {
    method: 'POST',
    data: { question_id: questionId }
  })
}

/**
 * 取消收藏
 * @param {number} questionId
 */
const removeFavorite = (questionId) => {
  return request('/favorites', {
    method: 'DELETE',
    data: { question_id: questionId }
  })
}

/**
 * 获取错题列表
 */
const getWrongQuestions = () => {
  return request('/favorites/wrong')
}

/**
 * 获取今日答题统计
 */
const getTodayStats = () => {
  return request('/practice/today-stats')
}

module.exports = {
  startPractice,
  submitAnswer,
  getRecords,
  getFavorites,
  addFavorite,
  removeFavorite,
  getWrongQuestions,
  getTodayStats
}