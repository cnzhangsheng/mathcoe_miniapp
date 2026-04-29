// services/question.js - 题目服务
const { request } = require('./api')

/**
 * 获取题目列表
 * @param {object} params - 查询参数
 */
const getQuestions = (params = {}) => {
  let url = '/questions?'
  if (params.topic_id) url += `topic_id=${params.topic_id}&`
  if (params.year) url += `year=${params.year}&`
  if (params.limit) url += `limit=${params.limit}`
  return request(url)
}

/**
 * 获取题目详情
 * @param {number} questionId
 */
const getQuestion = (questionId) => {
  return request(`/questions/${questionId}`)
}

/**
 * 获取专题列表
 */
const getTopics = () => {
  return request('/topics')
}

/**
 * 获取专题详情
 * @param {number} topicId
 */
const getTopic = (topicId) => {
  return request(`/topics/${topicId}`)
}

module.exports = {
  getQuestions,
  getQuestion,
  getTopics,
  getTopic
}