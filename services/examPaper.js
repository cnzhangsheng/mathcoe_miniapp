// services/examPaper.js - 考卷服务
const { request } = require('./api')

/**
 * 获取考卷列表
 * @param {object} params - 查询参数 { page, page_size, paper_type }
 */
const getExamPapers = (params = {}) => {
  let url = '/exam-papers?'
  if (params.page) url += `page=${params.page}&`
  if (params.page_size) url += `page_size=${params.page_size}&`
  if (params.paper_type) url += `paper_type=${params.paper_type}&`
  return request(url)
}

/**
 * 获取智能推荐考卷
 * @param {number} limit - 推荐数量
 */
const getRecommendedPapers = (limit = 2) => {
  return request(`/exam-papers/recommended?limit=${limit}`)
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
 * 获取测试报告详情（包含完整答题卡）
 * @param {number} testId
 */
const getTestReport = (testId) => {
  return request(`/exam-papers/tests/${testId}/report`)
}

/**
 * 直接提交考卷测试（不需要预先start）
 * 在交卷时一次性创建测试记录并保存答案
 * @param {number} examPaperId - 考卷ID
 * @param {object} data - { answers, time_spent }
 */
const submitExamPaper = (examPaperId, data) => {
  return request(`/exam-papers/${examPaperId}/submit`, { method: 'POST', data })
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

/**
 * 下载已生成的考卷 PDF（直接返回下载 URL）
 * @param {number} examPaperId
 * @returns {string} 下载 URL
 */
const getDownloadPdfUrl = (examPaperId) => {
  const app = getApp()
  const token = wx.getStorageSync('token') || app.globalData.token
  return `${app.globalData.baseUrl}/exam-papers/${examPaperId}/download-pdf?token=${token}`
}

/**
 * 用户生成考卷
 * @param {object} params - { mode, topic_ids, difficulty_level, question_count }
 */
const generatePaper = (params) => {
  return request('/exam-papers/generate', { method: 'POST', data: params })
}

/**
 * 获取用户生成的考卷列表
 * @param {number} page
 * @param {number} page_size
 */
const getMyPapers = (page = 1, page_size = 20) => {
  return request(`/exam-papers/my?page=${page}&page_size=${page_size}`)
}

/**
 * 生成考卷 PDF
 * @param {number} examPaperId
 */
const generatePdf = (examPaperId) => {
  return request(`/exam-papers/${examPaperId}/generate-pdf`, { method: 'POST' })
}

/**
 * 删除考卷
 * @param {number} examPaperId
 */
const deletePaper = (examPaperId) => {
  return request(`/exam-papers/${examPaperId}`, { method: 'DELETE' })
}

module.exports = {
  getExamPapers,
  getRecommendedPapers,
  getExamPaper,
  startExamPaperTest,
  submitTestAnswer,
  submitExamPaperTest,
  submitExamPaper,
  getExamPaperTests,
  getTestDetail,
  getTestReport,
  getDownloadPdfUrl,
  generatePaper,
  getMyPapers,
  generatePdf,
  deletePaper,
}