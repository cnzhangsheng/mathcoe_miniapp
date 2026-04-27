// pages/discover/discover.js
const app = getApp()
const discoverService = require('../../services/discover')
const reviewService = require('../../services/review')

Page({
  data: {
    loading: true,
    question: null,
    selectedOption: null,  // 当前选中的选项
    showAnswer: false,
    isLiked: false,
    isFavorited: false,
    likeCount: 0
  },

  onLoad() {
    this.loadRandomQuestion()
  },

  onShow() {
    // 每次显示时重新加载
    if (!this.data.loading && !this.data.question) {
      this.loadRandomQuestion()
    }
  },

  // 加载随机题目
  async loadRandomQuestion() {
    this.setData({ loading: true, showAnswer: false, selectedOption: null })

    try {
      const token = wx.getStorageSync('token')
      if (!token) {
        this.setData({ loading: false })
        return
      }

      // 调用 discover API 获取随机题目
      const question = await discoverService.getRandomQuestion()

      if (question) {
        // 格式化题目
        const formattedQuestion = {
          id: question.id,
          title: question.title || '题目',
          content: (question.content && question.content.text) || question.content || '',
          options: (question.options || []).map(opt => ({
            label: opt.label,
            text: (opt.content && opt.content.text) || opt.text || ''
          })),
          answer: question.answer,
          explanation: (question.explanation && question.explanation.text) || question.explanation || '暂无解析',
          difficulty: question.difficulty
        }

        this.setData({
          loading: false,
          question: formattedQuestion,
          selectedOption: null,
          showAnswer: false,
          isLiked: false,
          isFavorited: false,
          likeCount: Math.floor(Math.random() * 50) + 10  // 模拟点赞数
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '暂无题目', icon: 'none' })
      }
    } catch (err) {
      console.error('Load question failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 选择选项
  selectOption(e) {
    if (this.data.showAnswer) return  // 已显示答案后不可再选

    const option = e.currentTarget.dataset.option
    this.setData({ selectedOption: option })
  },

  // 显示/隐藏答案（需要先选择选项）
  toggleAnswer() {
    if (!this.data.selectedOption) {
      wx.showToast({ title: '请先选择答案', icon: 'none' })
      return
    }

    const { question, selectedOption } = this.data
    const isCorrect = selectedOption === question.answer

    this.setData({ showAnswer: true })

    // 如果答错，添加到错题本（不阻塞）
    if (!isCorrect) {
      reviewService.addWrongQuestion(question.id).then(() => {
        console.log('已加入错题本')
      }).catch(err => {
        console.error('添加错题失败:', err)
      })
    }
  },

  // 点赞
  toggleLike() {
    const { isLiked, likeCount } = this.data
    this.setData({
      isLiked: !isLiked,
      likeCount: isLiked ? likeCount - 1 : likeCount + 1
    })
    if (!isLiked) {
      wx.showToast({ title: '已点赞', icon: 'success' })
    }
  },

  // 收藏
  async toggleFavorite() {
    const { question, isFavorited } = this.data
    if (!question) return

    try {
      if (isFavorited) {
        // 取消收藏
        const result = await reviewService.removeFavorite(question.id)
        if (result && result.success) {
          wx.showToast({ title: '已取消收藏', icon: 'success' })
          this.setData({ isFavorited: false })
        }
      } else {
        // 添加收藏
        const result = await reviewService.addFavorite(question.id)
        if (result) {
          wx.showToast({ title: '已收藏', icon: 'success' })
          this.setData({ isFavorited: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 下一题
  nextQuestion() {
    this.setData({ selectedOption: null, showAnswer: false })
    this.loadRandomQuestion()
  },

  // 分享
  onShareAppMessage() {
    const { question } = this.data
    if (question) {
      return {
        title: question.title,
        path: '/pages/discover/discover'
      }
    }
    return {
      title: '数学探索',
      path: '/pages/discover/discover'
    }
  }
})