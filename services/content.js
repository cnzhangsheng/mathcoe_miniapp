/**
 * Content service - 内容管理相关 API
 */
const { request } = require('./api')

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
    const res = await request(`/banners?position=${position}`)
    return res || []
  } catch (err) {
    console.error('getBanners error:', err)
    return []
  }
}

module.exports = { getContentDetail, getBanners }
