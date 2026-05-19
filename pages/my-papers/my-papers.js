const examPaperService = require('../../services/examPaper')

Page({
  data: {
    papers: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: false,
  },

  onLoad() {
    this.loadPapers()
  },

  async loadPapers() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await examPaperService.getMyPapers(this.data.page, this.data.pageSize)
      const papers = res.items || []
      this.setData({
        papers: this.data.page === 1 ? papers : [...this.data.papers, ...papers],
        total: res.total || 0,
        hasMore: papers.length >= this.data.pageSize,
        loading: false,
      })
    } catch (err) {
      console.error('Load my papers failed:', err)
      this.setData({ loading: false })
    }
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      const page = this.data.page + 1
      this.setData({ page }, () => this.loadPapers())
    }
  },

  tapPaper(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title
    wx.navigateTo({
      url: `/pages/practice/practice?exam_paper_id=${id}&title=${encodeURIComponent(title)}`
    })
  },
})
