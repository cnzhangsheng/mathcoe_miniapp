// pages/records/records.js - 100%复刻 Records.tsx
const app = getApp()

Page({
  data: {
    loading: true,
    records: [
      {
        id: 'REC-001',
        title: '2024 L2 全真模拟考',
        type: '考试',
        score: 92,
        total: 100,
        time: '32:15',
        date: '2024.10.15',
        result: 'excellent'
      },
      {
        id: 'REC-002',
        title: '逻辑推理专项训练',
        type: '练习',
        score: 8,
        total: 10,
        time: '12:40',
        date: '2024.10.14',
        result: 'pass'
      },
      {
        id: 'REC-003',
        title: '算术周挑战赛',
        type: '挑战',
        score: 45,
        total: 50,
        time: '25:00',
        date: '2024.10.10',
        result: 'excellent'
      }
    ],
    stats: {
      total: 42,
      avgRate: 88.5
    }
  },

  onLoad() {
    this.loadRecords()
  },

  async loadRecords() {
    // TODO: 从后端获取真实数据
    this.setData({ loading: false })
  },

  goToDetail(e) {
    const recordId = e.currentTarget.dataset.id
    wx.showToast({
      title: '详情功能开发中',
      icon: 'none'
    })
  }
})