// pages/discover/discover.js
const app = getApp()
const discoverService = require('../../services/discover')
const reviewService = require('../../services/review')
const practiceService = require('../../services/practice')

Page({
  data: {
    loading: true,
    question: null,
    selectedOption: null,  // 当前选中的选项
    showAnswer: false,
    isLiked: false,
    isFavorited: false,
    likeCount: 0,
    topicTitle: '',
    questionType: '单选题',
    questionLevel: ''
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
        // 获取专题标题（后端直接返回 topic_title）
        const topicTitle = question.topic_title || this.getTopicTitle(question.topic_id)
        // 获取题目类型
        const questionType = question.question_type === 'multiple' ? '多选题' : '单选题'

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
        }

        // 获取点赞状态和收藏状态
        const likeStatus = await discoverService.getLikeStatus(question.id).catch(() => null)
        const isLiked = likeStatus?.is_liked || false
        const likeCount = likeStatus?.like_count || 0

        // 检查是否已收藏
        const isFavorited = await reviewService.isFavorited(question.id).catch(() => false)

        this.setData({
          loading: false,
          question: formattedQuestion,
          topicTitle,
          questionType,
          questionLevel: question.difficulty_level ? `L${question.difficulty_level}` : '',
          selectedOption: null,
          showAnswer: false,
          isLiked,
          isFavorited,
          likeCount
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

  // 根据专题 ID 获取专题标题
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

  // 选择选项
  selectOption(e) {
    if (this.data.showAnswer) return  // 已显示答案后不可再选

    const option = e.currentTarget.dataset.option
    this.setData({ selectedOption: option })
  },

  // 显示/隐藏答案（需要先选择选项）
  async toggleAnswer() {
    if (!this.data.selectedOption) {
      wx.showToast({ title: '请先选择答案', icon: 'none' })
      return
    }

    const { question, selectedOption } = this.data
    const isCorrect = selectedOption === question.answer

    // 保存答题记录到后端
    try {
      await practiceService.submitAnswer({
        question_id: question.id,
        user_answer: selectedOption
      })
      console.log('答题记录已保存')
    } catch (err) {
      console.error('保存答题记录失败:', err)
    }

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
  async toggleLike() {
    const { question, isLiked, likeCount } = this.data
    if (!question) return

    try {
      if (isLiked) {
        // 取消点赞
        const result = await discoverService.removeLike(question.id)
        if (result && result.success) {
          this.setData({ isLiked: false, likeCount: likeCount - 1 })
        }
      } else {
        // 添加点赞
        const result = await discoverService.addLike(question.id)
        if (result) {
          this.setData({ isLiked: true, likeCount: likeCount + 1 })
        }
      }
    } catch (err) {
      console.error('Like failed:', err)
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
          this.setData({ isFavorited: false })
        }
      } else {
        // 添加收藏
        const result = await reviewService.addFavorite(question.id)
        if (result) {
          this.setData({ isFavorited: true })
        }
      }
    } catch (err) {
      console.error('Favorite failed:', err)
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