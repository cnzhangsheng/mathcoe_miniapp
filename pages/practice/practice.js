// pages/practice/practice.js - 100%复刻 kangaroo-math-brain Practice.tsx
const examPaperService = require('../../services/examPaper')
const practiceService = require('../../services/practice')
const reviewService = require('../../services/review')

Page({
  data: {
    // Mode
    examPaperMode: false,

    // Exam Paper Info
    examPaper: null,

    // Questions
    questions: [],
    currentIndex: 1,
    totalQuestions: 0,
    currentQuestion: {},
    questionTypeText: '单选题',
    options: [],
    selectedOption: null,

    // Results
    results: {},
    progressPercent: 0,

    // Timer
    timeLeft: 0,
    formattedTime: '0:00',
    startTime: null,

    // Feedback (Practice Mode)
    showFeedback: false,
    isCorrect: false,
    correctAnswer: '',
    explanation: '',

    // Modals
    showAnswerSheet: false,
    isExamSubmitted: false,
    showUnansweredWarning: false,
    unansweredCount: 0,

    // Result Report - removed, will redirect to exam-report page
    estimatedScore: 0,
    completionRate: 0
  },

  onLoad(options) {
    const examPaperId = options.exam_paper_id
    const topicId = options.topic_id
    const title = options.title || ''

    // Save IDs for later use
    this.examPaperId = examPaperId || ''
    this.topicId = topicId || ''

    // 设置初始标题（从URL参数获取）
    if (title) {
      this.setData({
        examPaper: { title: decodeURIComponent(title) }
      })
    }

    if (examPaperId) {
      this.setData({ examPaperMode: true })
      wx.hideTabBar()
      this.loadExamPaper(examPaperId)
    } else if (topicId) {
      wx.hideTabBar()
      this.loadTopicPractice(topicId)
    } else {
      wx.showToast({ title: '缺少参数', icon: 'none' })
      setTimeout(() => {
        wx.showTabBar()
        wx.switchTab({ url: '/pages/topics/topics' })
      }, 1500)
    }
  },

  // Load Exam Paper
  async loadExamPaper(examPaperId) {
    try {
      // 不再预先创建测试记录，只在交卷时保存
      // 直接获取考卷详情
      const examPaper = await examPaperService.getExamPaper(examPaperId)
      if (examPaper && examPaper.questions && examPaper.questions.length > 0) {
        // 确保 questions 是数组，提取 question 对象
        let questions = []
        if (Array.isArray(examPaper.questions)) {
          questions = examPaper.questions.map(q => q.question || q)
        }

        // 确保 totalQuestions 是有效数字
        const totalQuestions = Math.max(1, questions.length)
        const firstQuestion = questions[0] || {}

        this.setData({
          examPaper,
          questions,
          totalQuestions: totalQuestions,
          currentQuestion: this.formatQuestion(firstQuestion),
          questionTypeText: this.getQuestionTypeText(firstQuestion),
          startTime: Date.now()
        })
        this.buildOptions(firstQuestion)
        this.updateProgress()
        this.startTimer()
      } else {
        wx.showToast({ title: '考卷无题目', icon: 'none' })
        setTimeout(() => {
          wx.showTabBar()
          wx.switchTab({ url: '/pages/topics/topics' })
        }, 1500)
      }
    } catch (err) {
      console.error('Load exam paper failed:', err)
      wx.showToast({ title: '加载失败，请登录', icon: 'none' })
      setTimeout(() => {
        wx.showTabBar()
        wx.switchTab({ url: '/pages/topics/topics' })
      }, 1500)
    }
  },

  // Load Topic Practice
  async loadTopicPractice(topicId) {
    try {
      const result = await practiceService.startPractice({ topic_id: topicId })
      if (!result) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          wx.showTabBar()
          wx.switchTab({ url: '/pages/topics/topics' })
        }, 1500)
        return
      }
      // 确保 questions 是数组
      let questions = []
      if (result.questions && Array.isArray(result.questions)) {
        questions = result.questions
      }

      // 确保 totalQuestions 是有效数字
      const totalQuestions = Math.max(1, questions.length)

      if (questions.length > 0) {
        const firstQuestion = questions[0] || {}
        this.setData({
          questions,
          totalQuestions: totalQuestions,
          currentQuestion: this.formatQuestion(firstQuestion),
          questionTypeText: this.getQuestionTypeText(firstQuestion),
          sessionId: result.session_id,
          startTime: Date.now()
        })
        this.buildOptions(firstQuestion)
        this.updateProgress()
        this.startTimer()
      } else {
        wx.showToast({ title: '专题无题目', icon: 'none' })
        setTimeout(() => {
          wx.showTabBar()
          wx.switchTab({ url: '/pages/topics/topics' })
        }, 1500)
      }
    } catch (err) {
      console.error('Load topic practice failed:', err)
      wx.showToast({ title: '加载失败，请登录', icon: 'none' })
      setTimeout(() => {
        wx.showTabBar()
        wx.switchTab({ url: '/pages/topics/topics' })
      }, 1500)
    }
  },

  // Format Question
  formatQuestion(question) {
    // 确保 question 有效
    if (!question || typeof question !== 'object') {
      return { contentHtml: '题目内容' }
    }
    // 从 content.text 提取 HTML 内容（数据结构：content = {"text": "<p>...</p>", "format": "html"})
    let contentHtml = ''
    if (question.content) {
      if (typeof question.content === 'string') {
        contentHtml = question.content
      } else if (typeof question.content === 'object' && question.content.text) {
        contentHtml = question.content.text
      }
    }
    // 如果没有 content，fallback 到 title
    if (!contentHtml) {
      contentHtml = question.title || '题目内容'
    }
    return {
      ...question,
      contentHtml
    }
  },

  // 获取题目类型文本
  getQuestionTypeText(question) {
    if (!question || !question.question_type) return '单选题'
    const type = question.question_type.toLowerCase()
    if (type === 'multiple') return '多选题'
    if (type === 'single') return '单选题'
    return '单选题'
  },

  // Build Options
  buildOptions(question) {
    // 确保 question 和 options 有效
    if (!question || typeof question !== 'object') {
      this.setData({ options: [] })
      return
    }
    const opts = question.options || []
    if (!Array.isArray(opts)) {
      this.setData({ options: [] })
      return
    }
    const formattedOptions = opts.map(opt => {
      // 提取 textHtml（选项也可能是 {text: "...", format: "html"} 结构）
      let textHtml = ''
      let text = ''
      if (opt && opt.content) {
        if (typeof opt.content === 'string') {
          textHtml = opt.content
          text = this.stripHtml(opt.content)
        } else if (typeof opt.content === 'object' && opt.content.text) {
          textHtml = opt.content.text
          text = this.stripHtml(opt.content.text)
        }
      }
      if (!textHtml && opt && opt.text) {
        textHtml = opt.text
        text = this.stripHtml(opt.text)
      }
      return {
        label: opt?.label || 'A',
        text,
        textHtml
      }
    })
    this.setData({ options: formattedOptions })
  },

  // 去除 HTML 标签（用于纯文本显示）
  stripHtml(html) {
    if (!html || typeof html !== 'string') return ''
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  },

  // Update Progress
  updateProgress() {
    let { currentIndex, totalQuestions } = this.data
    // 确保 currentIndex 和 totalQuestions 是有效数字
    currentIndex = Number(currentIndex) || 1
    totalQuestions = Number(totalQuestions) || 0
    if (totalQuestions === 0) {
      this.setData({ progressPercent: 0 })
      return
    }
    const percent = Math.floor((currentIndex / totalQuestions) * 100)
    this.setData({ progressPercent: Math.max(0, Math.min(100, percent)) })
  },

  // Start Timer
  startTimer() {
    this.startTime = Date.now()
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000)

      this.setData({
        timeLeft: elapsed,
        formattedTime: this.formatTime(elapsed)
      })
    }, 1000)
  },

  // Format Time
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  // Select Option
  selectOption(e) {
    const option = e.currentTarget.dataset.option
    if (!this.data.showFeedback && !this.data.isExamSubmitted) {
      this.setData({ selectedOption: option })
      // 自动保存答案
      if (this.data.examPaperMode) {
        this.saveCurrentAnswer()
      }
    }
  },

  // Go to Previous Question
  goToPrevQuestion() {
    const { currentIndex, questions } = this.data
    if (currentIndex <= 1) return

    const prevIndex = currentIndex - 1
    if (questions[prevIndex - 1]) {
      const prevQuestion = questions[prevIndex - 1]
      this.setData({
        currentIndex: prevIndex,
        currentQuestion: this.formatQuestion(prevQuestion),
        questionTypeText: this.getQuestionTypeText(prevQuestion),
        selectedOption: this.data.results[prevIndex] || null,
        showFeedback: false
      })
      this.buildOptions(prevQuestion)
      this.updateProgress()
    }
  },

  // Handle Next or Submit
  handleNextOrSubmit() {
    const { currentIndex, totalQuestions } = this.data

    if (currentIndex >= totalQuestions) {
      // Last question, directly trigger submit
      this.submitExam()
    } else {
      // Save current answer (if selected) and go to next
      this.saveCurrentAnswer()
      this.goToNextQuestion()
    }
  },

  // Save current answer
  saveCurrentAnswer() {
    const { currentIndex, selectedOption, results } = this.data
    if (selectedOption) {
      const newResults = { ...results }
      newResults[currentIndex] = selectedOption
      this.setData({ results: newResults })
      // 不再实时提交答案，只在交卷时一次性保存
    }
  },

  // Check Answer (Practice Mode)
  async checkAnswer() {
    const { currentQuestion, selectedOption } = this.data
    const correctAnswer = currentQuestion?.answer || ''
    const isCorrect = selectedOption === correctAnswer

    // 处理 explanation
    let explanation = ''
    if (currentQuestion?.explanation) {
      if (typeof currentQuestion.explanation === 'string') {
        explanation = currentQuestion.explanation
      } else if (typeof currentQuestion.explanation === 'object' && currentQuestion.explanation.text) {
        explanation = currentQuestion.explanation.text
      }
    }

    this.setData({
      showFeedback: true,
      isCorrect,
      correctAnswer,
      explanation: explanation || '暂无解析'
    })

    // 如果答错，添加到错题本
    if (!isCorrect && currentQuestion?.id) {
      try {
        await reviewService.addWrongQuestion(currentQuestion.id)
        console.log('已加入错题本:', currentQuestion.id)
      } catch (err) {
        console.error('添加错题失败:', err)
      }
    }
  },

  // Go to Next Question
  goToNextQuestion() {
    let { currentIndex, questions, totalQuestions } = this.data
    currentIndex = Number(currentIndex) || 1
    totalQuestions = Number(totalQuestions) || 0

    const nextIndex = currentIndex + 1

    if (nextIndex <= totalQuestions && questions[nextIndex - 1]) {
      const nextQuestion = questions[nextIndex - 1]
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: this.formatQuestion(nextQuestion),
        questionTypeText: this.getQuestionTypeText(nextQuestion),
        selectedOption: this.data.results[nextIndex] || null,
        showFeedback: false
      })
      this.buildOptions(nextQuestion)
      this.updateProgress()
    }
  },

  // Show Answer Sheet - 跳转到独立页面
  showAnswerSheet() {
    const { totalQuestions, results } = this.data
    wx.navigateTo({
      url: `/pages/answer-sheet/answer-sheet?totalQuestions=${totalQuestions}&results=${encodeURIComponent(JSON.stringify(results))}`
    })
  },

  // 从答题卡页面跳转回来时调用
  jumpToQuestionFromAnswerSheet(index) {
    index = Number(index) || 1
    const { questions, results } = this.data
    if (!questions || !questions[index - 1]) return

    const targetQuestion = questions[index - 1]
    this.setData({
      currentIndex: index,
      currentQuestion: this.formatQuestion(targetQuestion),
      questionTypeText: this.getQuestionTypeText(targetQuestion),
      selectedOption: results[index] || null,
      showFeedback: false
    })
    this.buildOptions(targetQuestion)
    this.updateProgress()
  },

  // Close Answer Sheet (已废弃，改为独立页面)
  closeAnswerSheet() {
    this.setData({ showAnswerSheet: false })
  },

  // Jump to Question from Answer Sheet
  jumpToQuestion(e) {
    let index = e.currentTarget.dataset.index
    index = Number(index) || 1

    const { questions, results } = this.data
    if (!questions || !questions[index - 1]) return

    const targetQuestion = questions[index - 1]
    this.setData({
      currentIndex: index,
      currentQuestion: this.formatQuestion(targetQuestion),
      questionTypeText: this.getQuestionTypeText(targetQuestion),
      selectedOption: results[index] || null,
      showAnswerSheet: false,
      showFeedback: false
    })
    this.buildOptions(targetQuestion)
    this.updateProgress()
  },

  // Submit Exam
  async submitExam() {
    const { results, totalQuestions } = this.data
    const answeredCount = Object.keys(results || {}).length
    const unansweredCount = (Number(totalQuestions) || 0) - answeredCount

    // 检查是否有未作答题目
    if (unansweredCount > 0) {
      this.setData({
        showUnansweredWarning: true,
        unansweredCount
      })
      return
    }

    // 全部已作答，直接提交
    await this.confirmSubmit()
  },

  // 确认提交（实际提交）
  async confirmSubmit() {
    clearInterval(this.timer)
    this.setData({ showUnansweredWarning: false, showAnswerSheet: false })

    let { results, totalQuestions, startTime, questions, examPaper } = this.data
    totalQuestions = Number(totalQuestions) || 0

    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0

    // Debug: 打印提交数据
    console.log('=== Submit Debug ===')
    console.log('examPaperId:', this.examPaperId)
    console.log('token:', wx.getStorageSync('token'))
    console.log('results:', results)
    console.log('timeSpent:', timeSpent)

    // Calculate correct/wrong count and answer sheet data
    let correctCount = 0
    const answerSheetData = []
    for (let i = 1; i <= totalQuestions; i++) {
      const question = questions[i - 1]
      const userAnswer = results[i]
      const correctAnswer = question?.answer || ''
      const isCorrect = userAnswer === correctAnswer
      if (isCorrect) correctCount++
      answerSheetData.push({
        index: i,
        userAnswer: userAnswer || '-',
        correctAnswer: correctAnswer,
        isCorrect: isCorrect
      })
    }
    const wrongCount = totalQuestions - correctCount
    const accuracyRate = totalQuestions > 0 ? Math.floor((correctCount / totalQuestions) * 100) : 0

    // Submit to backend - create exam_paper_test record on submit
    let testId = null
    if (this.examPaperId) {
      try {
        wx.showLoading({ title: '提交中...', mask: true })
        const submitResult = await examPaperService.submitExamPaper(this.examPaperId, {
          answers: results,
          time_spent: timeSpent
        })
        wx.hideLoading()
        console.log('Submit result:', submitResult)
        testId = submitResult?.id
      } catch (err) {
        wx.hideLoading()
        console.error('Submit exam failed:', err)
        wx.showToast({ title: '提交失败', icon: 'none' })
      }
    }

    // Navigate to exam-report page
    wx.showTabBar()
    if (testId) {
      // 使用 test_id 从后端获取完整报告数据
      wx.redirectTo({
        url: `/pages/exam-report/exam-report?test_id=${testId}&title=${encodeURIComponent(examPaper?.title || '')}`
      })
    } else {
      // 兼容旧方式：通过 URL 参数传递数据（备用）
      wx.redirectTo({
        url: `/pages/exam-report/exam-report?accuracyRate=${accuracyRate}&timeSpent=${timeSpent}&totalQuestions=${totalQuestions}&correctCount=${correctCount}&wrongCount=${wrongCount}&answerSheetData=${encodeURIComponent(JSON.stringify(answerSheetData))}&examPaperId=${this.examPaperId || ''}&topicId=${this.topicId || ''}&title=${encodeURIComponent(examPaper?.title || '')}`
      })
    }
  },

  // 返回作答（关闭提示弹窗）
  returnToAnswer() {
    this.setData({ showUnansweredWarning: false })
  },

  // Review Errors
  reviewErrors() {
    wx.showToast({ title: '错题解析功能开发中', icon: 'none' })
  },

  // Go Back
  goBack() {
    if (this.data.isExamSubmitted) {
      wx.showTabBar()
      wx.switchTab({ url: '/pages/topics/topics' })
    } else {
      wx.showModal({
        title: '确认退出',
        content: '考试进度将会丢失，确定要退出吗？',
        success: (res) => {
          if (res.confirm) {
            clearInterval(this.timer)
            wx.showTabBar()
            wx.switchTab({ url: '/pages/topics/topics' })
          }
        }
      })
    }
  },

  // Finish Practice
  finishPractice() {
    clearInterval(this.timer)
    wx.showTabBar()
    wx.switchTab({ url: '/pages/topics/topics' })
  },

  // Back to List (from result report)
  backToList() {
    wx.showTabBar()
    wx.switchTab({ url: '/pages/topics/topics' })
  },

  preventClose() {
    // Prevent close
  },

  onUnload() {
    clearInterval(this.timer)
    wx.showTabBar()
  }
})