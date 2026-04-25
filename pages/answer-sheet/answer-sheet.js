// pages/answer-sheet/answer-sheet.js
Page({
  data: {
    totalQuestions: 0,
    results: {}
  },

  onLoad(options) {
    const totalQuestions = parseInt(options.totalQuestions) || 0
    let results = {}

    if (options.results) {
      try {
        results = JSON.parse(decodeURIComponent(options.results))
      } catch (e) {
        console.error('Parse results failed:', e)
      }
    }

    this.setData({
      totalQuestions,
      results
    })
  },

  // 点击格子跳转到指定题目
  jumpToQuestion(e) {
    const index = e.currentTarget.dataset.index

    // 返回上一页并传递跳转索引
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]

    if (prevPage && prevPage.jumpToQuestionFromAnswerSheet) {
      prevPage.jumpToQuestionFromAnswerSheet(index)
    }

    wx.navigateBack()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})