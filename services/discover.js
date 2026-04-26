/**
 * Discover service - 探索页面API
 */
const request = require('./api')

/**
 * 获取随机题目
 */
const getRandomQuestion = async () => {
  return request('/discover/random')
}

module.exports = {
  getRandomQuestion
}