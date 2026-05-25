// 基础服务地址
const BASE_URL = 'http://127.0.0.1:8000'
// const BASE_URL = 'https://aicoe.cn'

// API 基础路径
const API_BASE_URL = BASE_URL + '/api/v1'

// 图片静态资源基础 URL
const IMAGE_BASE_URL = 'https://aicoe.cn/static/'

// 内容页面基础 URL
const CONTENT_BASE_URL = BASE_URL

// ==================== 难度等级常量 ====================
// 可在此修改选项值来控制全端难度等级下拉框
const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Level 1' },
  { value: 2, label: 'Level 2' },
  { value: 3, label: 'Level 3' },
  // { value: 4, label: 'Level 4' },
  // { value: 5, label: 'Level 5' },
  // { value: 6, label: 'Level 6' },
]

const DIFFICULTY_LABELS = DIFFICULTY_LEVELS.map(item => item.label)
const DIFFICULTY_VALUES = DIFFICULTY_LEVELS.map(item => item.value)

/** 根据数值获取难度等级标签，如 formatDifficulty(1) => 'Level 1' */
function formatDifficulty(value) {
  if (value == null || value === '') return ''
  // 如果已经是格式化后的字符串（如 "Level 1"），直接返回
  if (typeof value === 'string' && /^Level\s+\d+$/.test(value)) return value
  const found = DIFFICULTY_LEVELS.find(item => item.value === value)
  return found ? found.label : 'Level ' + value
}

module.exports = {
  BASE_URL,
  API_BASE_URL,
  IMAGE_BASE_URL,
  CONTENT_BASE_URL,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_VALUES,
  formatDifficulty,
}