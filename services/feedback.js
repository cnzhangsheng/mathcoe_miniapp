/**
 * Feedback service - 意见反馈
 */
const { request } = require('./api')

const submitFeedback = (data) => {
  return request('/feedbacks', {
    method: 'POST',
    data
  })
}

module.exports = { submitFeedback }