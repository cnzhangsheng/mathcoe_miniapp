// pages/review/review.js
const app = getApp()
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    wrongQuestions: [],
    groupedQuestions: []  // 按日期分组的错题
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 每次显示时重新加载数据
    this.loadData()
  },

  async loadData() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        wx.hideLoading()
        this.setData({ loading: false, wrongQuestions: [], groupedQuestions: [] })
        return
      }

      // 获取错题列表
      const wrongQuestions = await reviewService.getWrongQuestions() || []

      // 处理错题数据，格式化题目内容
      const formattedWrongQuestions = wrongQuestions.map(q => ({
        id: q.id,
        question_id: q.question_id,
        title: q.question_title || '题目',
        content: q.question_content?.text || '',
        options: q.question_options || [],
        answer: q.question_answer,
        explanation: q.question_explanation?.text || '',
        difficulty: q.question_difficulty || 'L2',
        user_answer: q.user_answer,
        retry_count: q.retry_count,
        mastered: q.mastered,
        created_at: q.created_at
      }))

      // 按日期分组
      const groupedQuestions = this.groupByDate(formattedWrongQuestions)

      this.setData({
        loading: false,
        wrongQuestions: formattedWrongQuestions,
        groupedQuestions
      })
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load data failed:', err)
      this.setData({ loading: false })
    }
  },

  // 按日期分组错题
  groupByDate(questions) {
    const today = this.formatDate(new Date())
    const groups = {}

    questions.forEach(q => {
      let dateStr = q.created_at ? this.formatDate(new Date(q.created_at)) : today
      if (!groups[dateStr]) {
        groups[dateStr] = []
      }
      groups[dateStr].push(q)
    })

    // 转换为数组并排序（最新日期在前）
    const sortedDates = Object.keys(groups).sort((a, b) => {
      return new Date(b) - new Date(a)
    })

    return sortedDates.map(date => ({
      date: date,
      dateLabel: this.getDateLabel(date),
      questions: groups[date]
    }))
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 获取日期显示标签
  getDateLabel(dateStr) {
    const today = this.formatDate(new Date())
    const yesterday = this.formatDate(new Date(Date.now() - 86400000))

    if (dateStr === today) {
      return '今天'
    } else if (dateStr === yesterday) {
      return '昨天'
    } else {
      return dateStr
    }
  },

  // 查看错题详情
  viewWrongQuestion(e) {
    const question = e.currentTarget.dataset.question
    if (question) {
      // 构建答题卡数据
      const answerSheet = [{
        index: 1,
        question_content: { text: question.content },
        question_options: question.options,
        user_answer: question.user_answer,
        correct_answer: question.answer,
        is_correct: false,
        question_explanation: { text: question.explanation }
      }]

      wx.navigateTo({
        url: `/pages/question-explanation/question-explanation?index=1&answerSheet=${encodeURIComponent(JSON.stringify(answerSheet))}`
      })
    }
  },

  // 从错题本移除
  async removeWrong(e) {
    const questionId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定从错题本移除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await reviewService.removeWrongQuestion(questionId)
            if (result && result.success) {
              wx.showToast({ title: '已移除', icon: 'success' })
              // 从列表中移除并重新分组
              const wrongQuestions = this.data.wrongQuestions.filter(q => q.question_id !== questionId)
              const groupedQuestions = this.groupByDate(wrongQuestions)
              this.setData({ wrongQuestions, groupedQuestions })
            } else {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})