// services/review.js - 错题本和收藏夹API
const { request } = require('./api')

/**
 * 获取专题列表
 */
const getTopics = async () => {
  return request('/topics')
}

/**
 * 获取错题列表
 */
const getWrongQuestions = async () => {
  return request('/favorites/wrong')
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
  const favorites = await request('/favorites') || []
  return favorites.some(f => f.question_id === questionId)
}

/**
 * 获取收藏列表
 */
const getFavorites = async () => {
  return request('/favorites')
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

module.exports = {
  getTopics,
  isFavorited,
  getWrongQuestions,
  addWrongQuestion,
  markMastered,
  removeWrongQuestion,
  getFavorites,
  addFavorite,
  removeFavorite
}