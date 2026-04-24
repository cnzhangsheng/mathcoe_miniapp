// services/examPaper.js - 考卷服务
const { request } = require('./api')

/**
 * 获取考卷列表
 * @param {object} params - 查询参数
 */
const getExamPapers = (params = {}) => {
  let url = '/exam-papers?'
  if (params.level) url += `level=${params.level}&`
  if (params.paper_type) url += `paper_type=${params.paper_type}&`
  return request(url)
}

/**
 * 获取考卷详情（包含题目列表）
 * @param {number} examPaperId
 */
const getExamPaper = (examPaperId) => {
  return request(`/exam-papers/${examPaperId}`)
}

/**
 * 开始考卷测试
 * @param {number} examPaperId
 */
const startExamPaperTest = (examPaperId) => {
  return request(`/exam-papers/${examPaperId}/start`, { method: 'POST' })
}

/**
 * 提交单题答案
 * @param {number} testId - 测试记录ID
 * @param {number} questionIndex - 题目序号
 * @param {string} userAnswer - 用户答案
 */
const submitTestAnswer = (testId, questionIndex, userAnswer) => {
  return request(`/exam-papers/tests/${testId}/answer`, { method: 'POST', data: {
    question_index: questionIndex,
    user_answer: userAnswer
  }})
}

/**
 * 完成考卷测试
 * @param {number} testId - 测试记录ID
 * @param {object} data - { answers, time_spent }
 */
const submitExamPaperTest = (testId, data) => {
  return request(`/exam-papers/tests/${testId}/submit`, { method: 'POST', data })
}

/**
 * 获取用户测试记录列表
 * @param {number} limit
 * @param {number} offset
 */
const getExamPaperTests = (limit = 20, offset = 0) => {
  return request(`/exam-papers/tests?limit=${limit}&offset=${offset}`)
}

/**
 * 获取测试记录详情
 * @param {number} testId
 */
const getTestDetail = (testId) => {
  return request(`/exam-papers/tests/${testId}`)
}

module.exports = {
  getExamPapers,
  getExamPaper,
  startExamPaperTest,
  submitTestAnswer,
  submitExamPaperTest,
  getExamPaperTests,
  getTestDetail
}