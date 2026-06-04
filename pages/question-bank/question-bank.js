// pages/question-bank/question-bank.js - 题库页面
const { searchQuestions, getTopics } = require('../../services/question')

const HISTORY_KEY = 'question_bank_history'
const MAX_HISTORY = 10

Page({
  data: {
    keyword: '',
    isSearching: false,
    hasSearched: false,
    showFilters: false,
    searchResults: [],
    searchTotal: 0,
    searchPage: 1,
    hasMore: false,
    searchHistory: [],
    showHistory: false,
    topics: [],
    selectedTopicId: null,
    selectedLevel: null,
    levelOptions: [
      { value: null, label: '全部难度' },
      { value: 1, label: 'Level 1' },
      { value: 2, label: 'Level 2' },
      { value: 3, label: 'Level 3' },
    ],
    topicOptions: [],
  },

  onLoad() {
    this.loadTopics()
    this.loadHistory()
  },

  async loadTopics() {
    try {
      const topics = await getTopics()
      const topicOptions = [{ value: null, label: '全部专题' }].concat(
        topics.map(t => ({ value: t.id, label: t.title }))
      )
      this.setData({ topics, topicOptions })
    } catch (err) {
      console.error('loadTopics error:', err)
    }
  },

  loadHistory() {
    const history = (wx.getStorageSync(HISTORY_KEY) || []).filter(Boolean)
    this.setData({ searchHistory: history, showHistory: history.length > 0 })
  },

  saveHistory(keyword) {
    if (!keyword || typeof keyword !== 'string') return
    let history = (wx.getStorageSync(HISTORY_KEY) || []).filter(Boolean)
    history = [keyword, ...history.filter(h => h !== keyword)].slice(0, MAX_HISTORY)
    wx.setStorageSync(HISTORY_KEY, history)
    this.setData({ searchHistory: history })
  },

  clearHistory() {
    wx.removeStorageSync(HISTORY_KEY)
    this.setData({ searchHistory: [] })
  },

  tapHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword, showHistory: false })
    this.doSearch(keyword)
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    if (!e.detail.value.trim()) {
      const history = (wx.getStorageSync(HISTORY_KEY) || []).filter(Boolean)
      this.setData({ isSearching: false, searchResults: [], searchHistory: history, showHistory: history.length > 0 })
    }
  },

  async onSearch(e) {
    const keyword = (e.detail.value || this.data.keyword).trim()
    if (!keyword) return
    this.doSearch(keyword)
  },

  async doSearch(keyword) {
    if (!keyword) return
    this.setData({ keyword, isSearching: true, hasSearched: true, searchPage: 1, showHistory: false })
    this.saveHistory(keyword)
    try {
      const res = await searchQuestions(keyword, this.data.selectedLevel, this.data.selectedTopicId, 1)
      const items = this.processResults(res.items)
      this.setData({
        searchResults: items,
        searchTotal: res.total || 0,
        hasMore: (res.items || []).length >= 20,
        showFilters: true,
      })
    } catch (err) {
      console.error('search error:', err)
    }
  },

  onFilterChange() {
    if (this.data.isSearching || this.data.hasSearched) {
      const keyword = this.data.keyword.trim()
      if (keyword) this.doSearch(keyword)
    }
  },

  getTopicBadgeClass(title) {
    const map = {
      '运算类': 'topic-yunsuan',
      '数理逻辑': 'topic-luoji',
      '图形类': 'topic-tuxing',
      '应用类': 'topic-yingyong',
    }
    return map[title] || 'topic-default'
  },

  processResults(items) {
    return (items || []).map(item => ({
      ...item,
      topicClass: this.getTopicBadgeClass(item.topic_title),
    }))
  },

  
  
  selectTopic(e) {
    const topicId = e.currentTarget.dataset.value
    this.setData({ selectedTopicId: topicId === '' ? null : parseInt(topicId) })
    this.onFilterChange()
  },

  selectLevel(e) {
    const level = e.currentTarget.dataset.value
    this.setData({ selectedLevel: level === '' ? null : parseInt(level) })
    this.onFilterChange()
  },

  async loadMoreSearch() {
    const page = this.data.searchPage + 1
    try {
      const res = await searchQuestions(this.data.keyword, this.data.selectedLevel, this.data.selectedTopicId, page)
      this.setData({
        searchResults: [...this.data.searchResults, ...this.processResults(res.items)],
        searchPage: page,
        hasMore: (res.items || []).length >= 20,
      })
    } catch (err) {
      console.error('loadMore error:', err)
    }
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMoreSearch()
    }
  },

  clearSearch() {
    const history = (wx.getStorageSync(HISTORY_KEY) || []).filter(Boolean)
    this.setData({
      keyword: '',
      isSearching: false,
      hasSearched: false,
      showFilters: false,
      searchResults: [],
      searchTotal: 0,
      searchHistory: history,
      showHistory: history.length > 0,
    })
  },

  goPractice(e) {
    const questionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/question-bank/question-detail/question-detail?question_id=${questionId}`,
    })
  },
})