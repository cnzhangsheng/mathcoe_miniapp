// pages/records/records.js - 用户历史答题记录
const practiceService = require('../../services/practice')
const reviewService = require('../../services/review')
const app = getApp()

Page({
  data: {
    loading: true,
    loadingMore: false,
    records: [],
    page: 1,
    pageSize: 10,
    hasMore: true,

    // 筛选条件
    topics: [],
    selectedTopicId: 0,
    selectedTime: 'all',
    selectedResult: 'all'
  },

  onLoad() {
    this.loadTopics()
    this.loadRecords()
  },

  async loadTopics() {
    try {
      const topics = await reviewService.getTopics()
      this.setData({ topics: topics || [] })
    } catch (err) {
      console.error('Load topics failed:', err)
    }
  },

  async loadRecords() {
    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        this.setData({ loading: false })
        return
      }

      // 构建筛选参数
      const filters = this.buildFilters()
      const result = await practiceService.getRecords(1, this.data.pageSize, filters)
      if (result) {
        const records = this.formatRecords(result.records || [])
        this.setData({
          loading: false,
          records,
          page: 1,
          hasMore: records.length < result.total
        })
      }
    } catch (err) {
      console.error('Load records failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  async loadMoreRecords() {
    if (this.data.loadingMore || !this.data.hasMore) return

    this.setData({ loadingMore: true })

    try {
      const nextPage = this.data.page + 1
      const filters = this.buildFilters()
      const result = await practiceService.getRecords(nextPage, this.data.pageSize, filters)

      if (result && result.records && result.records.length > 0) {
        const newRecords = this.formatRecords(result.records)
        const allRecords = [...this.data.records, ...newRecords]

        this.setData({
          records: allRecords,
          page: nextPage,
          hasMore: allRecords.length < result.total,
          loadingMore: false
        })
      } else {
        this.setData({
          hasMore: false,
          loadingMore: false
        })
      }
    } catch (err) {
      console.error('Load more records failed:', err)
      this.setData({ loadingMore: false })
    }
  },

  buildFilters() {
    const filters = {}
    if (this.data.selectedTopicId !== 0) {
      filters.topicId = this.data.selectedTopicId
    }
    if (this.data.selectedTime !== 'all') {
      filters.timeFilter = this.data.selectedTime
    }
    if (this.data.selectedResult !== 'all') {
      filters.resultFilter = this.data.selectedResult
    }
    return filters
  },

  formatRecords(records) {
    return records.map(r => {
      // 格式化日期
      const date = r.created_at ? new Date(r.created_at) : new Date()
      const dateStr = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`

      // 提取题目内容 HTML
      let contentHtml = ''
      if (r.question_content) {
        if (typeof r.question_content === 'string') {
          contentHtml = r.question_content
        } else if (typeof r.question_content === 'object' && r.question_content.text) {
          contentHtml = r.question_content.text
        }
      }
      if (!contentHtml && r.question_title) {
        contentHtml = r.question_title
      }

      return {
        id: r.id,
        topicTitle: r.question_topic_title || '日常练习',
        topicId: r.question_topic_id,
        contentHtml,
        date: dateStr,
        created_at: r.created_at,
        result: r.is_correct ? 'excellent' : 'fail',
        questionId: r.question_id,
        userAnswer: r.user_answer,
        correctAnswer: r.question_answer
      }
    })
  },

  // 专题筛选
  selectTopic(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedTopicId: id })
    this.loadRecords()
  },

  // 时间筛选
  selectTime(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ selectedTime: value })
    this.loadRecords()
  },

  // 结果筛选
  selectResult(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ selectedResult: value })
    this.loadRecords()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreRecords()
    }
  },

  goToDetail(e) {
    const record = e.currentTarget.dataset.record
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?question_id=${record.questionId}&user_answer=${record.userAnswer}&topic_title=${encodeURIComponent(record.topicTitle)}&is_correct=${record.result === 'excellent'}`
    })
  }
})