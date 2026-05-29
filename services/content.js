/**
 * Content service - 内容管理相关 API
 */
const { request } = require('./api')
const cache = require('./cache')

const BANNERS_CACHE_KEY = 'banners_home'
const BANNERS_CACHE_TTL = 60 * 60 * 1000 // 1 小时

const getContentDetail = async (slug) => {
  try {
    return await request(`/contents/${slug}/detail`)
  } catch (err) {
    console.error('getContentDetail error:', err)
    return null
  }
}

const getBanners = async (position = 'home') => {
  try {
    const cached = cache.get(BANNERS_CACHE_KEY)
    if (cached) return cached

    const res = await request(`/banners?position=${position}`)
    if (res) {
      cache.set(BANNERS_CACHE_KEY, res, BANNERS_CACHE_TTL)
    }
    return res || []
  } catch (err) {
    console.error('getBanners error:', err)
    return []
  }
}

module.exports = { getContentDetail, getBanners }
