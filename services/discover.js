/**
 * Discover service - 探索页面API
 */
const { request } = require('./api')

/**
 * 获取随机题目
 */
const getRandomQuestion = async () => {
  return request('/discover/random')
}

/**
 * 获取点赞状态
 * @param {number} questionId - 题目ID
 */
const getLikeStatus = async (questionId) => {
  return request(`/likes/${questionId}/status`)
}

/**
 * 添加点赞
 * @param {number} questionId - 题目ID
 */
const addLike = async (questionId) => {
  return request('/likes', { method: 'POST', data: { question_id: questionId } })
}

/**
 * 取消点赞
 * @param {number} questionId - 题目ID
 */
const removeLike = async (questionId) => {
  return request('/likes', { method: 'DELETE', data: { question_id: questionId } })
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