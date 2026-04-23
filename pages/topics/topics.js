// pages/topics/topics.js - 100%复刻 TopicTraining.tsx
const questionService = require('../../services/question')
const userService = require('../../services/user')

Page({
  data: {
    loading: true,
    activeTab: 'all',
    selectedTopic: null,

    // 过滤标签
    filterTabs: [
      { id: 'all', label: '全部专题', icon: '🔍' },
      { id: 'high', label: '高频核心', icon: '⚡' },
      { id: 'weak', label: '弱项突破', icon: '📈' }
    ],

    // 专题数据
    topics: [
      {
        id: 1,
        title: '算术与计数',
        desc: '掌握快速心算、单位换算以及基本的排列组合。',
        progress: 65,
        successRate: 88,
        difficulty: 'L1-L2',
        iconEmoji: '🧮',
        bgClass: 'bg-blue',
        progressClass: 'progress-blue',
        rateClass: 'rate-high',
        isHighFreq: true,
        tag: 'weak'
      },
      {
        id: 2,
        title: '逻辑与推理',
        desc: '袋鼠数学的核心，包含间接推理、真假判断等。',
        progress: 40,
        successRate: 62,
        difficulty: 'L2-L3',
        iconEmoji: '🧠',
        bgClass: 'bg-purple',
        progressClass: 'progress-purple',
        rateClass: 'rate-low',
        isHighFreq: true,
        tag: 'ai-recommended'
      },
      {
        id: 3,
        title: '几何与空间',
        desc: '图形拆解、旋转观察及周长面积的趣味应用。',
        progress: 52,
        successRate: 75,
        difficulty: 'L1-L3',
        iconEmoji: '📐',
        bgClass: 'bg-emerald',
        progressClass: 'progress-emerald',
        rateClass: 'rate-medium',
        isHighFreq: false
      },
      {
        id: 4,
        title: '规律与观察',
        desc: '发现视觉序列中的隐藏模式，锻炼敏锐洞察力。',
        progress: 25,
        successRate: 95,
        difficulty: 'L1-L2',
        iconEmoji: '👁',
        bgClass: 'bg-amber',
        progressClass: 'progress-amber',
        rateClass: 'rate-high',
        isHighFreq: false
      },
      {
        id: 5,
        title: '综合应用题',
        desc: '将数学引入生活场景，考察阅读理解与模型构建。',
        progress: 10,
        successRate: 45,
        difficulty: 'L3-L4',
        iconEmoji: '🛒',
        bgClass: 'bg-rose',
        progressClass: 'progress-rose',
        rateClass: 'rate-low',
        isHighFreq: true,
        tag: 'hard'
      }
    ],

    filteredTopics: [],

    // 知识点分布
    knowledgePoints: [
      { label: '数字敏感度', value: 90, barClass: 'bar-emerald' },
      { label: '空间思维', value: 45, barClass: 'bar-amber' },
      { label: '逻辑链推导', value: 65, barClass: 'bar-indigo' }
    ]
  },

  onLoad() {
    this.loadTopics()
  },

  async loadTopics() {
    try {
      const topics = await questionService.getTopics().catch(() => null)
      const progress = await userService.getUserProgress().catch(() => [])

      if (topics && topics.length > 0) {
        // 合并进度数据
        const topicsWithProgress = topics.map(topic => {
          const topicProgress = progress.find(p => p.topic_id === topic.id)
          return {
            ...topic,
            progress: topicProgress?.progress || 0,
            successRate: topicProgress?.success_rate || 0,
            questionsDone: topicProgress?.questions_done || 0
          }
        })
        this.setData({ topics: topicsWithProgress })
      }

      // 根据当前 tab 过滤
      this.filterTopics()
      this.setData({ loading: false })
    } catch (err) {
      console.error('Load topics failed:', err)
      this.filterTopics()
      this.setData({ loading: false })
    }
  },

  // 设置过滤 tab
  setActiveTab(e) {
    const tabId = e.currentTarget.dataset.id
    this.setData({ activeTab: tabId })
    this.filterTopics()
  },

  // 过滤专题
  filterTopics() {
    const { topics, activeTab } = this.data
    let filtered = topics

    if (activeTab === 'high') {
      filtered = topics.filter(t => t.isHighFreq)
    } else if (activeTab === 'weak') {
      filtered = topics.filter(t => t.successRate < 70)
    }

    this.setData({ filteredTopics: filtered })
  },

  // 选择专题，打开详情
  selectTopic(e) {
    const topicId = e.currentTarget.dataset.id
    const topic = this.data.topics.find(t => t.id === topicId)
    this.setData({ selectedTopic: topic })
  },

  // 关闭详情
  closeTopicDetail() {
    this.setData({ selectedTopic: null })
  },

  preventClose() {
    // 阻止点击内容区域关闭
  },

  // 开始专题练习
  startTopicPractice() {
    const topicId = this.data.selectedTopic.id
    this.setData({ selectedTopic: null })
    wx.navigateTo({
      url: `/pages/practice/practice?topic_id=${topicId}`
    })
  },

  // 跳转到练习
  goToPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice'
    })
  }
})