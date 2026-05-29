// services/review.js - 错题本和收藏夹API
const { request } = require('./api')
const cache = require('./cache')

const TOPICS_CACHE_KEY = 'topics_list'
const TOPICS_CACHE_TTL = 30 * 60 * 1000 // 30 分钟

/**
 * 获取专题列表（缓存 30 分钟）
 */
const getTopics = async () => {
  const cached = cache.get(TOPICS_CACHE_KEY)
  if (cached) return cached

  const result = await request('/topics')
  if (result) {
    cache.set(TOPICS_CACHE_KEY, result, TOPICS_CACHE_TTL)
  }
  return result
}

/**
 * 获取错题列表（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {number} [topicId] - 专题ID筛选
 */
const getWrongQuestions = async (page = 1, pageSize = 10, topicId) => {
  const params = { page, page_size: pageSize }
  if (topicId) params.topic_id = topicId
  return request('/favorites/wrong', { data: params })
}

/**
 * 添加错题
 * @param {number} questionId - 题目ID
 */
const addWrongQuestion = async (questionId) => {
  return request('/favorites/wrong', { method: 'POST', data: { question_id: questionId } })
}

/**
 * 标记错题已掌握
 * @param {number} questionId - 题目ID
 */
const markMastered = async (questionId) => {
  return request(`/favorites/wrong/${questionId}/master`, { method: 'PUT' })
}

/**
 * 从错题本移除
 * @param {number} questionId - 题目ID
 */
const removeWrongQuestion = async (questionId) => {
  return request(`/favorites/wrong/${questionId}`, { method: 'DELETE' })
}

/**
 * 检查是否已收藏
 * @param {number} questionId - 题目ID
 */
const isFavorited = async (questionId) => {
  const result = await request('/favorites', { data: { page: 1, page_size: 50 }, silent: true })
  return (result.items || []).some(f => f.question_id === questionId)
}

/**
 * 获取收藏列表（分页）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 */
const getFavorites = async (page = 1, pageSize = 10, topicId) => {
  const params = { page, page_size: pageSize }
  if (topicId) params.topic_id = topicId
  return request('/favorites', { data: params })
}

/**
 * 添加收藏
 * @param {number} questionId - 题目ID
 */
const addFavorite = async (questionId) => {
  return request('/favorites', { method: 'POST', data: { question_id: questionId } })
}

/**
 * 取消收藏
 * @param {number} questionId - 题目ID
 */
const removeFavorite = async (questionId) => {
  return request('/favorites', { method: 'DELETE', data: { question_id: questionId } })
}

/**
 * 获取全部错题（不分页，用于需要全量数据的页面）
 */
const getAllWrongQuestions = async () => {
  const result = await request('/favorites/wrong', { data: { page: 1, page_size: 200 } })
  return result?.items || []
}

/**
 * 获取全部收藏（不分页，用于需要全量数据的页面）
 */
const getAllFavorites = async () => {
  const result = await request('/favorites', { data: { page: 1, page_size: 200 } })
  return result?.items || []
}

module.exports = {
  getTopics,
  isFavorited,
  getWrongQuestions,
  getAllWrongQuestions,
  addWrongQuestion,
  markMastered,
  removeWrongQuestion,
  getFavorites,
  getAllFavorites,
  addFavorite,
  removeFavorite
}