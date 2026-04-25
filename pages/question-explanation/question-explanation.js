// pages/question-explanation/question-explanation.js
Page({
  data: {
    currentIndex: 1,
    totalCount: 1,
    answerSheet: [],
    questionContent: '',
    options: [],
    userAnswer: '',
    correctAnswer: '',
    isCorrect: true,
    explanation: ''
  },

  onLoad(options) {
    // 从 URL 参数解析数据
    const currentIndex = Number(options.index) || 1
    const answerSheet = JSON.parse(decodeURIComponent(options.answerSheet || '[]'))
    const totalCount = answerSheet.length

    this.setData({
      currentIndex,
      totalCount,
      answerSheet
    })

    this.loadQuestion(currentIndex)
  },

  // 加载指定题目的数据
  loadQuestion(index) {
    const item = this.data.answerSheet[index - 1]
    if (item) {
      this.setData({
        questionContent: item.question_content?.text || '',
        options: item.question_options || [],
        userAnswer: item.user_answer,
        correctAnswer: item.correct_answer,
        isCorrect: item.is_correct,
        explanation: item.question_explanation?.text || ''
      })
    }
  },

  // 上一题
  prevQuestion() {
    if (this.data.currentIndex > 1) {
      const newIndex = this.data.currentIndex - 1
      this.setData({ currentIndex: newIndex })
      this.loadQuestion(newIndex)
    }
  },

  // 下一题
  nextQuestion() {
    if (this.data.currentIndex < this.data.totalCount) {
      const newIndex = this.data.currentIndex + 1
      this.setData({ currentIndex: newIndex })
      this.loadQuestion(newIndex)
    }
  },

  // 返回答题卡
  goBack() {
    wx.navigateBack()
  }
})