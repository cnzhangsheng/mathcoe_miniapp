// pages/favorites/favorites.js - 100%复刻 Favorites.tsx
const app = getApp()

Page({
  data: {
    loading: true,
    favorites: [
      {
        id: 101,
        title: '逻辑推理：真假话判定',
        category: '逻辑',
        difficulty: 'L2',
        date: '2024.10.12',
        img: 'https://picsum.photos/seed/logic_fav/400/300'
      },
      {
        id: 105,
        title: '空间几何：展开图还原',
        category: '几何',
        difficulty: 'L3',
        date: '2024.10.10',
        img: 'https://picsum.photos/seed/geometry_fav/400/300'
      }
    ]
  },

  onLoad() {
    this.loadFavorites()
  },

  async loadFavorites() {
    // TODO: 从后端获取真实数据
    this.setData({ loading: false })
  },

  retryQuestion(e) {
    const questionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/practice/practice?question_id=${questionId}`
    })
  },

  removeFavorite(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已取消收藏', icon: 'success' })
        }
      }
    })
  }
})