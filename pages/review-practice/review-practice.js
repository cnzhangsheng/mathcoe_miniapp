// pages/review-practice/review-practice.js - 错题复习练习逻辑
const app = getApp()
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    questionIds: [],
    topicId: 0,  // 当前筛选的专题 ID
    questions: [],
    currentIndex: 0,
    totalQuestions: 0,
    progress: 0,

    currentQuestion: null,
    selectedAnswer: '',
    showResult: false,
    isCorrect: false,

    completed: false,
    correctCount: 0,

    // 题目属性
    topicTitle: '',
    questionType: '单选题'
  },

  onLoad(options) {
    const topicId = parseInt(options.topicId) || 0
    this.setData({ topicId })

    if (options.ids) {
      const ids = options.ids.split(',').map(id => parseInt(id))
      this.setData({ questionIds: ids, totalQuestions: ids.length })
      this.loadQuestions(ids)
    }
  },

  async loadQuestions(ids) {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      // 获取错题列表
      const wrongQuestions = await reviewService.getWrongQuestions() || []

      // 根据ID筛选题目
      const questions = ids.map(id => {
        const wrong = wrongQuestions.find(q => q.question_id === id)
        if (wrong) {
          // 转换 options 格式: [{label: 'A', text: '内容'}] -> [{key: 'A', value: '内容'}]
          const options = (wrong.question_options || []).map(opt => ({
            key: opt.label || opt.key,
            value: opt.text || opt.value || opt.content?.text || ''
          }))

          return {
            id: wrong.id,
            question_id: wrong.question_id,
            topic_id: wrong.question_topic_id,
            topicTitle: this.getTopicTitle(wrong.question_topic_id),
            content: wrong.question_content?.text || wrong.question_content || '',
            options: options,
            answer: wrong.question_answer,
            explanation: wrong.question_explanation?.text || wrong.question_explanation || '',
            question_type: wrong.question_type || 'single'
          }
        }
        return null
      }).filter(q => q !== null)

      if (questions.length > 0) {
        this.setData({
          loading: false,
          questions,
          totalQuestions: questions.length,
          currentIndex: 0,
          currentQuestion: questions[0],
          progress: 100 / questions.length,
          correctCount: 0,
          selectedAnswer: '',
          showResult: false,
          isCorrect: false,
          completed: false
        })
        this.updateQuestionMeta(questions[0])
      } else {
        wx.hideLoading()
        wx.showToast({ title: '错题已全部完成', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/review/review' })
        }, 1500)
        return
      }

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  getTopicTitle(topicId) {
    const titles = {
      1: '算术与计数',
      2: '逻辑与推理',
      3: '几何与空间',
      4: '规律与观察',
      5: '综合应用题'
    }
    return titles[topicId] || '其他'
  },

  updateQuestionMeta(question) {
    const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'
    this.setData({
      topicTitle: question.topicTitle,
      questionType
    })
  },

  selectOption(e) {
    if (this.data.showResult) return

    const key = e.currentTarget.dataset.key
    this.setData({ selectedAnswer: key })
  },

  submitAnswer() {
    if (!this.data.selectedAnswer) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }

    const { currentQuestion, selectedAnswer } = this.data
    const isCorrect = selectedAnswer === currentQuestion.answer

    this.setData({
      showResult: true,
      isCorrect
    })

    if (isCorrect) {
      this.setData({ correctCount: this.data.correctCount + 1 })
      // 答对时从错题本移除
      reviewService.removeWrongQuestion(currentQuestion.question_id).catch(err => {
        console.error('移除错题失败:', err)
      })
    }
  },

  nextQuestion() {
    const { currentIndex, questions } = this.data

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1
      const nextQuestion = questions[nextIndex]

      this.setData({
        currentIndex: nextIndex,
        currentQuestion: nextQuestion,
        selectedAnswer: '',
        showResult: false,
        isCorrect: false,
        progress: ((nextIndex + 1) / questions.length) * 100
      })
      this.updateQuestionMeta(nextQuestion)
    } else {
      // 完成
      this.setData({ completed: true })
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/review/review' })
  },

  goReview() {
    // 继续练习：重新加载当前专题下的最新错题
    this.setData({ loading: true, completed: false })
    this.loadLatestWrongQuestions()
  },

  async loadLatestWrongQuestions() {
    wx.showLoading({ title: '加载中...', mask: true })

    try {
      // 获取错题列表
      const wrongQuestions = await reviewService.getWrongQuestions() || []

      // 根据专题筛选
      let filtered = wrongQuestions
      if (this.data.topicId > 0) {
        filtered = wrongQuestions.filter(q => parseInt(q.question_topic_id) === this.data.topicId)
      }

      if (filtered.length === 0) {
        wx.hideLoading()
        wx.showToast({ title: '该专题暂无错题', icon: 'none' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/review/review' })
        }, 1500)
        return
      }

      // 随机抽取最多10题
      const shuffled = filtered.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, 10)

      // 转换题目格式
      const questions = selected.map(wrong => {
        const options = (wrong.question_options || []).map(opt => ({
          key: opt.label || opt.key,
          value: opt.text || opt.value || opt.content?.text || ''
        }))

        return {
          id: wrong.id,
          question_id: wrong.question_id,
          topic_id: wrong.question_topic_id,
          topicTitle: this.getTopicTitle(wrong.question_topic_id),
          content: wrong.question_content?.text || wrong.question_content || '',
          options: options,
          answer: wrong.question_answer,
          explanation: wrong.question_explanation?.text || wrong.question_explanation || '',
          question_type: wrong.question_type || 'single'
        }
      })

      const questionIds = questions.map(q => q.question_id)

      this.setData({
        loading: false,
        questions,
        questionIds,
        totalQuestions: questions.length,
        currentIndex: 0,
        currentQuestion: questions[0],
        progress: 100 / questions.length,
        correctCount: 0,
        selectedAnswer: '',
        showResult: false,
        isCorrect: false,
        completed: false
      })
      this.updateQuestionMeta(questions[0])

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('Load questions failed:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '错题复习 - 袋鼠数学助理',
      path: '/pages/review/review'
    }
  }
})