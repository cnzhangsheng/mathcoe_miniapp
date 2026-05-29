const examPaperService = require('../../services/examPaper')
const questionService = require('../../services/question')
const userService = require('../../services/user')
const { DIFFICULTY_VALUES, DIFFICULTY_LEVELS } = require('../../utils/constants')

const app = getApp()

// 模块级锁，防止快速重复点击生成多条考卷
let _generating = false

Page({
  data: {
    title: '',
    topics: [],
    selectedTopicIds: [],
    selectedTopicSet: {},
    difficultyLevel: 1,
    difficultyValues: DIFFICULTY_VALUES,
    difficultyOptions: DIFFICULTY_LEVELS,
    questionCount: 24,
    wrongSelected: false,
    favoriteSelected: false,
    showResult: false,
    resultPaper: {},
    showError: false,
    errorMsg: '',
  },

  onLoad() {
    _generating = false
    this.loadUserGrade()
    this.loadTopics()
  },

  async loadUserGrade() {
    try {
      // 优先从 globalData 获取用户的 difficulty_level
      let level = app.globalData.userInfo?.difficulty_level
      // 未加载则从 API 获取
      if (!level) {
        const userInfo = await userService.getUserInfo()
        level = userInfo?.difficulty_level
        if (userInfo) app.globalData.userInfo = userInfo
      }
      if (level) {
        this.setData({ difficultyLevel: Math.min(level, 6) })
      }
    } catch (err) {
      console.error('Failed to load user difficulty level:', err)
    }
  },

  async loadTopics() {
    const res = await questionService.getTopics()
    this.setData({ topics: res || [] })
  },

  toggleTopic(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10)
    console.log('[generate-paper] toggleTopic', id, this.data.selectedTopicIds)
    if (isNaN(id)) return
    const selectedSet = { ...this.data.selectedTopicSet }
    let selectedIds = [...this.data.selectedTopicIds]
    if (selectedSet[id]) {
      delete selectedSet[id]
      selectedIds = selectedIds.filter(v => v !== id)
    } else {
      selectedSet[id] = true
      selectedIds.push(id)
    }
    this.setData({ selectedTopicIds: selectedIds, selectedTopicSet: selectedSet })
  },

  selectDifficulty(e) {
    this.setData({ difficultyLevel: e.currentTarget.dataset.level })
  },

  onQuestionCountChange(e) {
    this.setData({ questionCount: e.detail.value })
  },

  toggleWrong() {
    this.setData({ wrongSelected: !this.data.wrongSelected })
  },

  toggleFavorite() {
    this.setData({ favoriteSelected: !this.data.favoriteSelected })
  },

  onTitleInput(e) {
    let val = e.detail.value || ''
    if (val.length > 50) val = val.slice(0, 50)
    this.setData({ title: val })
  },

  async generatePaper() {
    if (_generating) return
    _generating = true
    this.setData({ generating: true })

    const { title, selectedTopicIds, difficultyLevel, questionCount } = this.data

    if (!title.trim()) {
      wx.showToast({ title: '请输入考卷标题', icon: 'none' })
      _generating = false
      this.setData({ generating: false })
      return
    }

    if (selectedTopicIds.length === 0) {
      wx.showToast({ title: '请至少选择一个专题', icon: 'none' })
      _generating = false
      this.setData({ generating: false })
      return
    }

    try {
      const { wrongSelected, favoriteSelected } = this.data
      const res = await examPaperService.generatePaper({
        title: title.trim(),
        mode: 'manual',
        topic_ids: selectedTopicIds,
        difficulty_level: difficultyLevel,
        question_count: questionCount,
        include_wrong: wrongSelected,
        include_favorite: favoriteSelected,
      })

      if (!res) {
        wx.hideLoading()
        this.setData({
          generating: false,
          showError: true,
          errorMsg: '生成失败，请检查专题是否包含足够题目',
        })
        _generating = false
        return
      }

      // 弹出成功对话框
      this.setData({
        generating: false,
        showResult: true,
        resultPaper: res.data || res,
      })
      _generating = false
    } catch (err) {
      console.error('Generate paper failed:', err)
      this.setData({
        generating: false,
        showError: true,
        errorMsg: err.errMsg || '网络异常，生成失败',
      })
      _generating = false
    }
  },

  // 关闭失败弹窗
  closeError() {
    this.setData({ showError: false })
  },

  // 查看我的考卷（跳转首页并激活我的考卷tab）
  goToMyPapers() {
    getApp().globalData.indexPaperTab = 'my'
    wx.switchTab({ url: '/pages/index/index' })
  },
})
