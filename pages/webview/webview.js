// pages/webview/webview.js - 外部链接 WebView
Page({
  data: {
    url: '',
  },

  onLoad(options) {
    const url = options.url
    if (url) {
      this.setData({ url: decodeURIComponent(url) })
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
    }
  },
})
