/**
 * Discover service - 探索页面API
 */
const { request } = require('./api')

/**
 * 获取随机题目（加权随机，新题更高概率）
 * @param {number[]} [excludeIds] - 本次会话已看过的题目ID列表，用于去重
 */
const getRandomQuestion = async (excludeIds) => {
  let url = '/discover/random'
  if (excludeIds && excludeIds.length > 0) {
    url += '?exclude_ids=' + excludeIds.join(',')
  }
  return request(url)
}

/**
 * 获取点赞状态
 * @param {number} questionId - 题目ID
 */
const getLikeStatus = async (questionId) => {
  return request(`/likes/${questionId}/status`, { silent: true })
}

/**
 * 添加点赞
 * @param {number} questionId - 题目ID
 */
const addLike = async (questionId) => {
  return request('/likes', { method: 'POST', data: { question_id: questionId }, silent: true })
}

/**
 * 取消点赞
 * @param {number} questionId - 题目ID
 */
const removeLike = async (questionId) => {
  return request('/likes', { method: 'DELETE', data: { question_id: questionId }, silent: true })
}

/**
 * 获取题目详情
 * @param {number} questionId - 题目ID
 */
const getQuestionById = async (questionId) => {
  return request(`/questions/${questionId}`)
}

module.exports = {
  getRandomQuestion,
  getLikeStatus,
  addLike,
  removeLike,
  getQuestionById
}