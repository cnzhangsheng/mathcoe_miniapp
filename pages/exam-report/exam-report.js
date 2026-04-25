// pages/exam-report/exam-report.js
const examPaperService = require('../../services/examPaper')

Page({
  data: {
    testId: null,
    examPaperId: null,
    examPaperTitle: '',
    score: 0,
    accuracyRate: 0,
    formattedTime: '0:00',
    totalQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    answerSheet: [],
    loading: true
  },

  onLoad(options) {
    // 优先使用 test_id 从后端获取数据
    const testId = options.test_id
    const examPaperId = options.exam_paper_id
    const examPaperTitle = decodeURIComponent(options.title || '')

    this.setData({
      testId: testId ? Number(testId) : null,
      examPaperId: examPaperId ? Number(examPaperId) : null,
      examPaperTitle
    })

    if (testId) {
      // 从后端 API 获取测试报告
      this.loadTestReport(testId)
    } else {
      // 兼容旧方式：从 URL 参数获取（备用）
      this.loadFromUrlParams(options)
    }
  },

  // 从后端 API 加载测试报告
  async loadTestReport(testId) {
    try {
      wx.showLoading({ title: '加载中...', mask: true })
      const report = await examPaperService.getTestReport(testId)
      wx.hideLoading()

      if (report) {
        // 格式化时间
        const timeSpent = report.time_spent || 0
        const mins = Math.floor(timeSpent / 60)
        const secs = timeSpent % 60
        const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`

        this.setData({
          testId: report.id,
          examPaperId: report.exam_paper_id,
          examPaperTitle: report.exam_paper_title || this.data.examPaperTitle,
          score: report.score,
          accuracyRate: report.score,
          formattedTime,
          totalQuestions: report.total_questions,
          correctCount: report.correct_count,
          wrongCount: report.wrong_count,
          answerSheet: report.answer_sheet || [],
          loading: false
        })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('Load test report failed:', err)
      wx.showToast({ title: '加载失败，请登录', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 兼容旧方式：从 URL 参数加载（备用）
  loadFromUrlParams(options) {
    const accuracyRate = Number(options.accuracyRate) || 0
    const timeSpent = Number(options.timeSpent) || 0
    const totalQuestions = Number(options.totalQuestions) || 0
    const correctCount = Number(options.correctCount) || 0
    const wrongCount = Number(options.wrongCount) || 0
    const answerSheetData = JSON.parse(options.answerSheetData || '[]')

    // 格式化时间
    const mins = Math.floor(timeSpent / 60)
    const secs = timeSpent % 60
    const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`

    this.setData({
      accuracyRate,
      formattedTime,
      totalQuestions,
      correctCount,
      wrongCount,
      answerSheet: answerSheetData,
      loading: false
    })
  },

  // 查看题目详情（解析）
  viewQuestionDetail(e) {
    const index = e.currentTarget.dataset.index
    if (this.data.answerSheet.length > 0) {
      wx.navigateTo({
        url: `/pages/question-explanation/question-explanation?index=${index}&answerSheet=${encodeURIComponent(JSON.stringify(this.data.answerSheet))}`
      })
    }
  },

  // 重新练习
  retryPractice() {
    const { examPaperId, examPaperTitle } = this.data

    if (examPaperId) {
      wx.redirectTo({
        url: `/pages/practice/practice?exam_paper_id=${examPaperId}&title=${encodeURIComponent(examPaperTitle)}`
      })
    } else {
      wx.switchTab({ url: '/pages/topics/topics' })
    }
  },

  // 返回专题列表
  backToTopics() {
    wx.switchTab({ url: '/pages/topics/topics' })
  }
})