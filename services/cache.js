/**
 * Cache service - 前端内存缓存
 * 使用 TTL 避免短时间内重复请求，减少加载闪烁
 */

const store = {}

/**
 * 获取缓存
 * @param {string} key
 * @returns {*|null} 缓存数据，过期或不存在返回 null
 */
const get = (key) => {
  const entry = store[key]
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    delete store[key]
    return null
  }
  return entry.data
}

/**
 * 设置缓存
 * @param {string} key
 * @param {*} data
 * @param {number} ttl - 过期时间（毫秒），默认 2 分钟
 */
const set = (key, data, ttl = 120000) => {
  store[key] = {
    data,
    expiresAt: Date.now() + ttl,
  }
}

/**
 * 清除指定缓存
 * @param {string} key
 */
const remove = (key) => {
  delete store[key]
}

/**
 * 清除所有缓存
 */
const clear = () => {
  Object.keys(store).forEach(key => delete store[key])
}

module.exports = { get, set, remove, clear }
