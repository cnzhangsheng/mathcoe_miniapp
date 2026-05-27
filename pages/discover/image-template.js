/**
 * 图片生成模板配置
 * 修改布局、颜色、字体等只需编辑此文件
 */
module.exports = {
  // 画布设计尺寸（CSS 像素）
  designWidth: 375,
  // 与页面卡片内边距一致 (48rpx ≈ 24px)
  padding: 24,
  // 绿色背景板边距
  boardPaddingTop: 40,
  boardPaddingBottom: 16,
  boardPaddingH: 16,
  // 输出图片宽度（高度等比缩放）
  outputWidth: 1078,

  colors: {
    bg: '#FFFFFF',
    accent: '#07C160',
    bgGradientTop: '#07C160',
    bgGradientBottom: '#059A4E',
    text: '#333333',
    muted: '#999999',
    optLabel: '#6366F1',
    optText: 'rgba(0,0,0,0.85)',
    divider: '#EEEEEE',
    badgeTopicBg: '#FFF0D6',
    badgeTopic: '#FF8A00',
    badgeDiffBg: '#FEF3C7',
    badgeDiff: '#D97706',
    badgeTypeBg: '#E8F4FD',
    badgeType: '#0284C7',
  },

  fonts: {
    badge: 'bold 13px sans-serif',
    type: '12px sans-serif',
    content: '14px sans-serif',
    option: '13px sans-serif',
    optionLabel: 'bold 15px sans-serif',
  },

  lineHeight: 24,
  optionIndent: 24,

  // 选项容器样式（匹配页面 option-item）
  optionItem: {
    paddingV: 16,   // 32rpx ≈ 16px
    paddingH: 24,   // 48rpx ≈ 24px
    borderRadius: 24, // 48rpx
    borderWidth: 2,  // 4rpx
    borderColor: 'rgba(0,0,0,0.03)',
    bgColor: '#FFFFFF',
    gap: 16,         // 32rpx ≈ 16px (label 与文本间距)
    marginBottom: 12, // 24rpx ≈ 12px
    // 标签框样式
    labelBoxSize: 40,  // 80rpx
    labelBoxRadius: 16, // 32rpx
    labelBoxBg: 'rgba(0,0,0,0.05)',
    labelColor: 'rgba(0,0,0,0.85)',
  },

  // 二维码
  qrcode: {
    url: 'https://aicoe.cn/static/gh_a825adb86ce3_258.jpg',
    height: 80,
  },
}
