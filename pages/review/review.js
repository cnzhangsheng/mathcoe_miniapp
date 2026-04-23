// pages/review/review.js - 100%复刻 Review.tsx
const app = getApp()

Page({
  data: {
    activeTab: 'incorrect', // 'incorrect' or 'favorites'
    loading: true,

    // AI Error Analysis Data
    errorTypes: [
      { label: '计算', value: 45 },
      { label: '逻辑', value: 80, highlight: true },
      { label: '空间', value: 20 },
      { label: '阅读', value: 60 },
      { label: '规律', value: 35 }
    ],

    // Categories with questions
    categories: [
      {
        id: 'logic',
        title: '逻辑与推理',
        icon: '🧩',
        bgColor: 'amber',
        count: 2,
        questions: [
          {
            id: 1,
            title: '消失的规律序列',
            status: 'critical',
            retention: 15,
            difficulty: 'L2',
            errorReason: '模式识别失效',
            img: 'https://picsum.photos/seed/logic1/400/300'
          }
        ]
      },
      {
        id: 'geometry',
        title: '几何与空间',
        icon: '📦',
        bgColor: 'blue',
        count: 1,
        questions: [
          {
            id: 3,
            title: '折纸后的投影',
            status: 'warning',
            retention: 45,
            difficulty: 'L3',
            errorReason: '空间旋转迷失',
            img: 'https://picsum.photos/seed/geo1/400/300'
          }
        ]
      }
    ],

    // Favorites
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
    ],

    // Stats
    totalWrong: 12,
    todayProgress: 65
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    // TODO: 从后端获取真实数据
    this.setData({ loading: false })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  startQuickReview() {
    wx.showToast({
      title: '开始闪电复习',
      icon: 'success'
    })
    // TODO: 实现闪电复习功能
  },

  retryQuestion(e) {
    const questionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/practice/practice?question_id=${questionId}`
    })
  },

  markMastered(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showToast({
      title: '已标记掌握',
      icon: 'success'
    })
  },

  analyzeQuestion(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showToast({
      title: '深度分析功能开发中',
      icon: 'none'
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
  },

  removeWrong(e) {
    const questionId = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已移除', icon: 'success' })
        }
      }
    })
  },

  goToSimilarQuestions(e) {
    wx.showToast({
      title: '关联题目功能开发中',
      icon: 'none'
    })
  }
})