/**
 * 下载图片共享模块
 * 封装 canvas 绘制题目的所有逻辑，供各页面复用
 */
const IMG_TPL = require('../pages/discover/image-template')

// ==================== 对外接口 ====================

/**
 * 下载题目图片到相册
 * @param {Object} card - 题目卡片数据 {question, topicTitle, questionLevel, questionType}
 * @param {Object} [template] - 可选模板配置覆盖
 */
async function downloadQuestionImage(canvas, card, template) {
  const T = template || IMG_TPL
  const ctx = canvas.getContext('2d')
  const { question, topicTitle, questionLevel, questionType } = card
  const cw = T.designWidth - T.padding * 2
  const optionLabels = (question.options || []).map((_, i) =>
    String.fromCharCode(65 + i)
  )

  // 解析内容中的图片
  const segments = parseContentSegments(question.content || '')
  const allUrls = collectImageUrls(segments, question.options || [])
  allUrls.add('https://aicoe.cn/static/gh_a825adb86ce3_258.jpg')

  // 下载图片
  const imageInfos = new Map()
  if (allUrls.size > 0) {
    const loaded = await loadImageInfos([...allUrls])
    await loadCanvasImages(canvas, loaded)
    loaded.forEach((v, k) => imageInfos.set(k, v))
  }

  // 构建有序 section 列表
  const sections = [
    { id: 'badges', topicTitle, questionLevel, questionType },
    { id: 'content', segments, imageInfos, cw },
    { id: 'options', options: question.options || [], optionLabels, imageInfos, cw },
    { id: 'divider' },
    { id: 'qrcode', imageInfos },
  ]

  // Pass 1: 计算总高度
  let totalH = T.padding
  for (const sec of sections) {
    sec._h = sectionHeight(ctx, sec)
    totalH += sec._h
  }
  totalH += T.padding

  // 设置 canvas 输出分辨率（高度加上绿色背景板）
  const outScale = T.outputWidth / T.designWidth
  const bpH = T.boardPaddingH || 0
  const bpT = T.boardPaddingTop || bpH || 0
  const bpB = T.boardPaddingBottom || bpH || 0
  const totalBoard = bpT + bpB
  const cardW = T.designWidth - bpH * 2
  canvas.width = Math.round(T.designWidth * outScale)
  canvas.height = Math.round((totalH + totalBoard) * outScale)
  ctx.scale(outScale, outScale)
  ctx.textBaseline = 'top'

  // 绿色背景板（自上而下渐变）
  const grad = ctx.createLinearGradient(0, 0, 0, totalH + totalBoard)
  grad.addColorStop(0, T.colors.bgGradientTop || T.colors.accent)
  grad.addColorStop(1, T.colors.bgGradientBottom || T.colors.accent)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, T.designWidth, totalH + totalBoard)

  // 白色内容卡片（圆角矩形）
  ctx.fillStyle = T.colors.bg
  roundRectPath(ctx, bpH, bpT, cardW, totalH, 24)
  ctx.fill()

  // Pass 2: 逐 section 绘制（偏移 boardPaddingTop）
  let y = bpT + T.padding
  for (const sec of sections) {
    drawSection(ctx, sec, y, T)
    y += sec._h
  }
}

/**
 * 将 canvas 内容保存到相册（不含 loading/error 处理，由调用方负责）
 */
async function saveImageToAlbum(canvas) {
  const tempRes = await new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({ canvas, success: resolve, fail: reject })
  })
  await new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempRes.tempFilePath,
      success: resolve,
      fail: reject,
    })
  })
}

module.exports = {
  downloadQuestionImage,
  saveImageToAlbum,
  parseContentSegments,
  collectImageUrls,
  loadImageInfos,
  loadCanvasImages,
}

// ==================== 图片下载 ====================

function collectImageUrls(segments, options) {
  const urls = new Set()
  segments.filter(s => s.type === 'image').forEach(s => urls.add(s.url))
  ;(options || []).forEach(opt => {
    parseContentSegments(opt.text || '').filter(s => s.type === 'image').forEach(s => urls.add(s.url))
  })
  return urls
}

function parseContentSegments(html) {
  if (!html) return [{ type: 'text', content: '' }]
  const segments = []
  let lastIndex = 0
  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: html.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'image', url: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < html.length) {
    segments.push({ type: 'text', content: html.slice(lastIndex) })
  }
  return segments.length ? segments : [{ type: 'text', content: html }]
}

async function loadImageInfos(urls) {
  if (!urls.length) return new Map()
  const results = await Promise.all(urls.map(url =>
    new Promise((resolve) => {
      wx.getImageInfo({
        src: url,
        success: (res) => resolve({ url, path: res.path, width: res.width, height: res.height }),
        fail: () => resolve(null),
      })
    })
  ))
  const map = new Map()
  results.forEach(r => { if (r) map.set(r.url, r) })
  return map
}

async function loadCanvasImages(canvas, imageInfos) {
  if (!imageInfos.size) return
  const tasks = []
  for (const [, info] of imageInfos) {
    tasks.push(new Promise((resolve) => {
      const img = canvas.createImage()
      img.onload = () => { info.canvasImg = img; resolve() }
      img.onerror = () => resolve()
      img.src = info.path
    }))
  }
  await Promise.all(tasks)
}

// ==================== Section 高度计算 & 绘制 ====================

function sectionHeight(ctx, sec) {
  switch (sec.id) {
    case 'badges': return 28
    case 'divider': return 17
    case 'qrcode': return 6 + IMG_TPL.qrcode.height + 4
    case 'content': return calcSegmentsHeight(ctx, sec.segments, sec.cw, sec.imageInfos)
    case 'options': return calcOptionsHeight(ctx, sec)
    default: return 0
  }
}

function drawSection(ctx, sec, y, T) {
  switch (sec.id) {
    case 'badges':
      drawBadges(ctx, sec, y, T)
      break
    case 'content':
      drawSegments(ctx, sec.segments, T.padding, y, sec.cw, sec.imageInfos, {
        font: T.fonts.content, color: T.colors.text, lineH: 24,
      })
      break
    case 'options':
      drawOptionsList(ctx, sec, y, T)
      break
    case 'divider':
      ctx.fillStyle = T.colors.divider
      ctx.fillRect(T.padding, y + 16, sec.cw || (T.designWidth - T.padding * 2), 1)
      break
    case 'qrcode':
      drawQRCode(ctx, sec, y + 6, T)
      break
  }
}

// --- Badges: 专题 + 难度 + 题型 ---

function drawBadges(ctx, sec, y, T) {
  const p = T.padding

  ctx.font = T.fonts.badge

  // 专题
  const topic = sec.topicTitle || '数学'
  const tw = ctx.measureText(topic).width
  ctx.fillStyle = T.colors.badgeTopicBg
  roundRect(ctx, p, y - 2, tw + 16, 20, 4)
  ctx.fillStyle = T.colors.badgeTopic
  ctx.fillText(topic, p + 8, y)

  let xOff = p + tw + 24

  // 难度
  if (sec.questionLevel) {
    const lw = ctx.measureText(sec.questionLevel).width
    ctx.fillStyle = T.colors.badgeDiffBg
    roundRect(ctx, xOff - 4, y - 2, lw + 16, 20, 4)
    ctx.fillStyle = T.colors.badgeDiff
    ctx.fillText(sec.questionLevel, xOff + 4, y)
    xOff += lw + 24
  }

  // 题型徽章
  if (sec.questionType) {
    ctx.font = T.fonts.badge
    const typeLabel = '(' + sec.questionType + ')'
    const typeW = ctx.measureText(typeLabel).width
    ctx.fillStyle = T.colors.badgeTypeBg
    roundRect(ctx, xOff - 4, y - 2, typeW + 16, 20, 4)
    ctx.fillStyle = T.colors.badgeType
    ctx.fillText(typeLabel, xOff + 4, y)
  }
}

// --- Content: 题目内容图文混排 ---

function calcSegmentsHeight(ctx, segments, cw, imageInfos) {
  let h = 12
  for (const seg of segments) {
    if (seg.type === 'text') {
      const text = stripHtml(seg.content)
      if (text) {
        ctx.font = IMG_TPL.fonts.content
        h += 24 * wrapText(ctx, text, cw).length + 4
      }
    } else if (seg.type === 'image') {
      const info = imageInfos.get(seg.url)
      if (info && info.canvasImg && info.width > 0) {
        h += info.height * (Math.min(info.width, cw) / info.width) + 10
      }
    }
  }
  return h + 12
}

function drawSegments(ctx, segments, x, y, cw, imageInfos, style) {
  y += 12

  for (const seg of segments) {
    if (seg.type === 'text') {
      const text = stripHtml(seg.content)
      if (text) {
        ctx.font = style.font
        ctx.fillStyle = style.color
        const lines = wrapText(ctx, text, cw)
        lines.forEach(line => { ctx.fillText(line, x, y); y += style.lineH })
        y += 4
      }
    } else if (seg.type === 'image') {
      const info = imageInfos.get(seg.url)
      if (info && info.canvasImg && info.width > 0) {
        const imgW = Math.min(info.width, cw)
        const imgH = info.height * (imgW / info.width)
        const imgX = x + (cw - imgW) / 2
        ctx.drawImage(info.canvasImg, imgX, y, imgW, imgH)
        y += imgH + 10
      }
    }
  }
}

// --- Options: 选项容器绘制 ---

function calcOptionsHeight(ctx, sec) {
  const T = IMG_TPL
  const oi = T.optionItem
  const cw = sec.cw
  let h = 8

  sec.options.forEach((opt) => {
    const segs = parseContentSegments(opt.text || '')
    let textH = 0
    let first = true

    for (const seg of segs) {
      if (seg.type === 'text') {
        const text = stripHtml(seg.content)
        if (text) {
          ctx.font = T.fonts.option
          const maxW = cw - oi.paddingH * 2 - oi.labelBoxSize - oi.gap
          textH += 24 * wrapText(ctx, text, Math.max(maxW, 50)).length
          first = false
        }
      } else if (seg.type === 'image') {
        if (first) { textH += 24; first = false }
        const info = sec.imageInfos.get(seg.url)
        if (info && info.canvasImg && info.width > 0) {
          const imgMaxW = cw - oi.paddingH * 2
          textH += info.height * (Math.min(info.width, imgMaxW) / info.width) + 8
        }
      }
    }

    h += oi.paddingV + Math.max(oi.labelBoxSize, textH) + oi.paddingV + oi.marginBottom
  })
  return h
}

function drawOptionsList(ctx, sec, y, T) {
  const oi = T.optionItem
  const cw = sec.cw
  const xBase = T.padding
  y += 8

  sec.options.forEach((opt, i) => {
    const segs = parseContentSegments(opt.text || '')
    let textH = 0
    let first = true

    // Pass 1: 计算文本高度确定容器大小
    for (const seg of segs) {
      if (seg.type === 'text') {
        const text = stripHtml(seg.content)
        if (text) {
          ctx.font = T.fonts.option
          const maxW = cw - oi.paddingH * 2 - oi.labelBoxSize - oi.gap
          textH += 24 * wrapText(ctx, text, Math.max(maxW, 50)).length
          first = false
        }
      } else if (seg.type === 'image') {
        if (first) { textH += 24; first = false }
        const info = sec.imageInfos.get(seg.url)
        if (info && info.canvasImg && info.width > 0) {
          const imgMaxW = cw - oi.paddingH * 2
          textH += info.height * (Math.min(info.width, imgMaxW) / info.width) + 8
        }
      }
    }

    const contentH = Math.max(oi.labelBoxSize, textH)
    const boxH = oi.paddingV + contentH + oi.paddingV

    // 绘制容器背景
    roundRectPath(ctx, xBase, y, cw, boxH, oi.borderRadius)
    ctx.fillStyle = oi.bgColor
    ctx.fill()
    if (oi.borderWidth > 0) {
      ctx.strokeStyle = oi.borderColor
      ctx.lineWidth = oi.borderWidth
      ctx.stroke()
    }

    // 绘制标签框 "A"
    const labelX = xBase + oi.paddingH
    const labelY = y + oi.paddingV
    const label = sec.optionLabels[i]

    roundRectPath(ctx, labelX, labelY, oi.labelBoxSize, oi.labelBoxSize, oi.labelBoxRadius)
    ctx.fillStyle = oi.labelBoxBg
    ctx.fill()

    // 标签文字居中
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = T.fonts.optionLabel
    ctx.fillStyle = oi.labelColor
    ctx.fillText(label, labelX + oi.labelBoxSize / 2, labelY + oi.labelBoxSize / 2)
    ctx.restore()

    // 绘制选项文本（与标签框顶部对齐）
    let drawY = labelY
    const textX = labelX + oi.labelBoxSize + oi.gap
    const textMaxW = cw - oi.paddingH * 2 - oi.labelBoxSize - oi.gap

    for (const seg of segs) {
      if (seg.type === 'text') {
        const text = stripHtml(seg.content)
        if (text) {
          ctx.font = T.fonts.option
          ctx.fillStyle = T.colors.optText
          const lines = wrapText(ctx, text, Math.max(textMaxW, 50))
          lines.forEach(line => {
            ctx.fillText(line, textX, drawY)
            drawY += 24
          })
        }
      } else if (seg.type === 'image') {
        if (drawY < labelY + oi.labelBoxSize) {
          drawY = labelY + oi.labelBoxSize + 8
        }
        const info = sec.imageInfos.get(seg.url)
        if (info && info.canvasImg && info.width > 0) {
          const imgMaxW = cw - oi.paddingH * 2
          const imgW = Math.min(info.width, imgMaxW)
          const imgH = info.height * (imgW / info.width)
          const imgX = xBase + oi.paddingH + (imgMaxW - imgW) / 2
          ctx.drawImage(info.canvasImg, imgX, drawY, imgW, imgH)
          drawY += imgH + 8
        }
      }
    }

    y += boxH + oi.marginBottom
  })
}

// --- QR Code ---

function drawQRCode(ctx, sec, y, T) {
  const info = sec.imageInfos.get(T.qrcode.url)
  if (!info || !info.canvasImg || !info.width) return

  const qrH = T.qrcode.height
  const qrW = qrH * (info.width / info.height)
  const qrX = (T.designWidth - qrW) / 2
  ctx.drawImage(info.canvasImg, qrX, y, qrW, qrH)
}

// ==================== 工具函数 ====================

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return ['']
  const lines = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const char of paragraph) {
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = testLine
      }
    }
    if (line) lines.push(line)
  }
  return lines.length ? lines : ['']
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function roundRect(ctx, x, y, w, h, r) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fill()
}
