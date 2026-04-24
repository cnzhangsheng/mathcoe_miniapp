// pages/exam-report/exam-report.js
Page({
  data: {
    accuracyRate: 0,
    formattedTime: '0:00',
    totalQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    answerSheetData: [],
    examPaperId: null,
    topicId: null,
    examPaperTitle: ''
  },

  onLoad(options) {
    // Parse query parameters
    const accuracyRate = Number(options.accuracyRate) || 0
    const timeSpent = Number(options.timeSpent) || 0
    const totalQuestions = Number(options.totalQuestions) || 0
    const correctCount = Number(options.correctCount) || 0
    const wrongCount = Number(options.wrongCount) || 0
    const examPaperId = options.examPaperId || ''
    const topicId = options.topicId || ''
    const examPaperTitle = decodeURIComponent(options.title || '')
    const answerSheetData = JSON.parse(options.answerSheetData || '[]')

    // Format time
    const mins = Math.floor(timeSpent / 60)
    const secs = timeSpent % 60
    const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`

    this.setData({
      accuracyRate,
      formattedTime,
      totalQuestions,
      correctCount,
      wrongCount,
      answerSheetData,
      examPaperId,
      topicId,
      examPaperTitle
    })
  },

  // Go to Wrong Book
  goToWrongBook() {
    wx.switchTab({ url: '/pages/review/review' })
  },

  // Retry Practice
  retryPractice() {
    const { examPaperId, topicId, examPaperTitle } = this.data

    if (examPaperId) {
      wx.redirectTo({
        url: `/pages/practice/practice?exam_paper_id=${examPaperId}&title=${encodeURIComponent(examPaperTitle)}`
      })
    } else if (topicId) {
      wx.redirectTo({
        url: `/pages/practice/practice?topic_id=${topicId}&title=${encodeURIComponent(examPaperTitle)}`
      })
    } else {
      wx.switchTab({ url: '/pages/topics/topics' })
    }
  },

  // Back to Topics
  backToTopics() {
    wx.switchTab({ url: '/pages/topics/topics' })
  }
})