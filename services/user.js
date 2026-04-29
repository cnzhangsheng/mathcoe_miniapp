// services/user.js - 用户服务
const { request } = require('./api')

/**
 * 获取当前用户信息
 */
const getUserInfo = () => {
  return request('/users/me')
}

/**
 * 获取能力雷达
 */
const getAbilityRadar = () => {
  return request('/users/ability-radar')
}

/**
 * 获取 AI 学习洞察
 */
const getUserInsight = () => {
  return request('/users/insight')
}

/**
 * 获取用户学习统计
 */
const getUserStats = () => {
  return request('/users/stats')
}

/**
 * 更新用户信息
 * @param {object} data - 更新数据
 */
const updateUserInfo = (data) => {
  return request('/users/me', {
    method: 'PATCH',
    data
  })
}

module.exports = {
  getUserInfo,
  getAbilityRadar,
  getUserInsight,
  getUserStats,
  updateUserInfo
}