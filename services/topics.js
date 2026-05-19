/**
 * Topics service - 专题统一映射管理
 * 避免专题 ID 映射在 7 个页面中重复定义
 */
const { request } = require('./api')

const TOPIC_TITLES = {
  1001: '图形类',
  1002: '数理逻辑',
  1003: '应用类',
  1004: '运算类',
}

const TOPIC_CLASSES = {
  1001: 'topic-tuxing',    // 图形类 - 草莓粉
  1002: 'topic-luoji',     // 数理逻辑 - 薄荷青
  1003: 'topic-yingyong',  // 应用类 - 糖果绿
  1004: 'topic-yunsuan',   // 运算类 - 蜜桃橙
}

/**
 * 获取专题标题
 * @param {number} topicId
 * @returns {string}
 */
const getTopicTitle = (topicId) => {
  return TOPIC_TITLES[topicId] || '其他'
}

/**
 * 获取专题标签颜色样式
 * @param {number} topicId
 * @returns {string}
 */
const getTopicClass = (topicId) => {
  return TOPIC_CLASSES[topicId] || 'topic-default'
}

/**
 * 获取专题列表
 * @returns {Promise<Array>}
 */
const getTopics = () => {
  return request('/topics')
}

/**
 * 获取用户薄弱专题分析
 * @returns {Promise<object>}
 */
const getWeakAnalysis = () => {
  return request('/practice/weak-analysis').catch(() => null)
}

module.exports = {
  TOPIC_TITLES,
  TOPIC_CLASSES,
  getTopicTitle,
  getTopicClass,
  getTopics,
  getWeakAnalysis,
}
