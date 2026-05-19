const examPaperService = require('../../services/examPaper')
const questionService = require('../../services/question')

Page({
  data: {
    title: '',
    topics: [],
    selectedTopicIds: [],
    selectedTopicSet: {},
    difficultyLevel: 1,
    questionCount: 12,
    generating: false,
  },

  onLoad() {
    this.loadTopics()
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

  selectQuestionCount(e) {
    this.setData({ questionCount: e.currentTarget.dataset.count })
  },

  onTitleInput(e) {
    let val = e.detail.value || ''
    if (val.length > 50) val = val.slice(0, 50)
    this.setData({ title: val })
  },

  async generatePaper() {
    const { title, selectedTopicIds, difficultyLevel, questionCount } = this.data

    if (!title.trim()) {
      wx.showToast({ title: '请输入考卷标题', icon: 'none' })
      return
    }

    if (selectedTopicIds.length === 0) {
      wx.showToast({ title: '请至少选择一个专题', icon: 'none' })
      return
    }

    this.setData({ generating: true })
    try {
      const result = await examPaperService.generatePaper({
        title: title.trim(),
        mode: 'manual',
        topic_ids: selectedTopicIds,
        difficulty_level: difficultyLevel,
        question_count: questionCount,
      })

      wx.showToast({ title: '生成成功！', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      console.error('Generate paper failed:', err)
      wx.showToast({ title: err.errMsg || '生成失败', icon: 'none' })
    } finally {
      this.setData({ generating: false })
    }
  },
})
