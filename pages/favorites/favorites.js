// pages/favorites/favorites.js - 重定向到复习页收藏夹
Page({
  onLoad() {
    wx.switchTab({
      url: '/pages/review/review'
    })
  }
})
