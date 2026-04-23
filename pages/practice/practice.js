// pages/practice/practice.js - 100%复刻 Practice.tsx
const practiceService = require('../../services/practice')

Page({
  data: {
    mode: 'normal',
    questions: [],
    currentIndex: 0,
    currentQuestion: {},
    selectedOption: null,
    showFeedback: false,
    isCorrect: false,
    correctAnswer: 'B',
    explanation: '',
    sessionId: '',
    timeLeft: 2700,
    formattedTime: '45:00',
    isExamMode: false,

    // 标记状态
    isFlagged: false,
    isLiked: false,
    isBookmarked: false,

    // 弹窗状态
    showAnswerSheet: false,
    showAICoach: false,
    aiLoading: false,
    aiMessage: '',

    // 选项数据
    options: [
      { id: 'A', label: '展开图 A' },
      { id: 'B', label: '展开图 B' },
      { id: 'C', label: '展开图 C' },
      { id: 'D', label: '展开图 D' }
    ]
  },

  onLoad(options) {
    const mode = options.mode || 'normal'
    const topicId = options.topic_id
    const year = options.year

    this.setData({
      mode,
      isExamMode: mode === 'exam'
    })

    this.startPractice(topicId, mode, year)

    if (mode === 'exam') {
      this.startTimer()
    }
  },

  async startPractice(topicId, mode, year) {
    try {
      const result = await practiceService.startPractice({
        topic_id: topicId,
        mode,
        year
      })

      // 模拟数据用于展示
      const mockQuestion = {
        id: 1,
        title: '下面哪个展开图可以拼成立方体？',
        difficulty: 'L2',
        content: {
          image: 'https://picsum.photos/seed/cube_expansion/400/300'
        }
      }

      this.setData({
        questions: result.questions || [mockQuestion],
        currentQuestion: result.questions ? result.questions[0] : mockQuestion,
        sessionId: result.session_id,
        timeLimit: result.time_limit
      })
    } catch (err) {
      console.error('Start practice failed:', err)
      // 使用模拟数据
      this.setData({
        currentQuestion: {
          id: 1,
          title: '下面哪个展开图可以拼成立方体？',
          difficulty: 'L2',
          content: {
            image: 'https://picsum.photos/seed/cube_expansion/400/300'
          }
        },
        questions: [{
          id: 1,
          title: '下面哪个展开图可以拼成立方体？',
          difficulty: 'L2',
          content: { image: 'https://picsum.photos/seed/cube_expansion/400/300' }
        }]
      })
    }
  },

  startTimer() {
    this.timer = setInterval(() => {
      const timeLeft = this.data.timeLeft - 1
      if (timeLeft <= 0) {
        clearInterval(this.timer)
        this.finishPractice()
      }
      this.setData({
        timeLeft,
        formattedTime: this.formatTime(timeLeft)
      })
    }, 1000)
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  // 选择选项
  selectOption(e) {
    const option = e.currentTarget.dataset.option
    if (!this.data.showFeedback) {
      this.setData({ selectedOption: option })
    }
  },

  // 切换标记
  toggleFlag() {
    this.setData({ isFlagged: !this.data.isFlagged })
  },

  toggleLike() {
    this.setData({ isLiked: !this.data.isLiked })
    if (this.data.isLiked) {
      wx.showToast({ title: '已点赞', icon: 'success' })
    }
  },

  toggleBookmark() {
    this.setData({ isBookmarked: !this.data.isBookmarked })
    if (this.data.isBookmarked) {
      wx.showToast({ title: '已收藏', icon: 'success' })
    }
  },

  // 提交答案
  async submitAnswer() {
    if (!this.data.selectedOption) return

    const currentQuestion = this.data.currentQuestion

    try {
      const result = await practiceService.submitAnswer({
        question_id: currentQuestion.id,
        user_answer: this.data.selectedOption
      })

      this.setData({
        showFeedback: true,
        isCorrect: result.is_correct,
        correctAnswer: result.correct_answer,
        explanation: result.explanation
      })
    } catch (err) {
      console.error('Submit answer failed:', err)
      // 模拟正确答案
      const isCorrect = this.data.selectedOption === 'B'
      this.setData({
        showFeedback: true,
        isCorrect: isCorrect,
        correctAnswer: 'B',
        explanation: '袋鼠数学中常见的立方体展开规律为"1-4-1"。选项B完美契合，折叠后所有边刚好闭合。'
      })
    }
  },

  // 下一题
  nextQuestion() {
    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.questions.length) {
      this.finishPractice()
    } else {
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: this.data.questions[nextIndex],
        selectedOption: null,
        showFeedback: false,
        isCorrect: false,
        correctAnswer: '',
        explanation: '',
        isFlagged: false,
        isLiked: false,
        isBookmarked: false
      })
    }
  },

  // 完成练习
  finishPractice() {
    clearInterval(this.timer)
    wx.showModal({
      title: '练习完成',
      content: '恭喜你完成了本次练习！',
      showCancel: false,
      success: () => {
        wx.navigateBack()
      }
    })
  },

  // 答题卡弹窗
  openAnswerSheet() {
    this.setData({ showAnswerSheet: true })
  },

  closeAnswerSheet() {
    this.setData({ showAnswerSheet: false })
  },

  preventClose() {
    // 阻止点击内容区域关闭弹窗
  },

  // AI教练
  askAICoach() {
    this.setData({
      showAICoach: true,
      aiLoading: true
    })

    // 模拟AI响应
    setTimeout(() => {
      this.setData({
        aiLoading: false,
        aiMessage: '袋鼠数学中常见的立方体展开规律为"1-4-1"结构。试着观察选项中哪些图形符合这个结构特点吧！'
      })
    }, 2000)
  },

  closeAICoach() {
    this.setData({ showAICoach: false })
  },

  onUnload() {
    clearInterval(this.timer)
  }
})