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
  if (params.limit) url += `limit=${params.limit}&`
  if (params.sort_by) url += `sort_by=${params.sort_by}`
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

/**
 * 获取推荐题目
 * @param {number} limit - 题目数量
 */
const getRecommendedQuestions = (limit = 10) => {
  return request(`/questions/recommended?limit=${limit}`)
}

/**
 * 搜索题目
 * @param {string} keyword 搜索关键词
 * @param {number} [level] 难度级别
 * @param {number} [topic_id] 专题ID
 * @param {number} [page=1] 页码
 * @param {number} [size=20] 每页数量
 */
const searchQuestions = (keyword, level, topic_id, page = 1, size = 20) => {
  let url = `/questions/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`
  if (level) url += `&level=${level}`
  if (topic_id) url += `&topic_id=${topic_id}`
  return request(url)
}

/**
 * 获取题目排行
 * @param {number} level 难度级别 1/2/3
 */
const getRankings = (level) => {
  return request(`/questions/rankings?level=${level}`)
}

module.exports = {
  getQuestions,
  getRecommendedQuestions,
  getQuestion,
  getTopics,
  getTopic,
  searchQuestions,
  getRankings
}