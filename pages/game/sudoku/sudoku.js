// pages/game/sudoku/sudoku.js - 100%复刻 Sudoku.tsx
Page({
  data: {
    grid: [],
    initialGrid: [],
    selectedCell: null,
    isWin: false,
    showInfo: false
  },

  onLoad() {
    this.resetGame()
  },

  // 初始化游戏（使用6x6数独）
  resetGame() {
    // 简单的 6x6 数独谜题
    const puzzle = [
      [1, null, 4, 3, null, null],
      [null, null, null, null, 1, 4],
      [2, null, null, null, 4, 1],
      [null, 4, 1, 2, null, null],
      [null, null, 2, 4, null, 3],
      [4, 1, null, null, null, null]
    ]

    // 将null转换为空字符串显示
    const grid = puzzle.map(row => row.map(cell => cell || ''))
    const initialGrid = puzzle.map(row => row.map(cell => cell !== null))

    this.setData({
      grid,
      initialGrid,
      selectedCell: null,
      isWin: false
    })
  },

  // 选择单元格
  selectCell(e) {
    const row = e.currentTarget.dataset.row
    const col = e.currentTarget.dataset.col

    // 不能选择初始单元格
    if (this.data.initialGrid[row][col]) return

    this.setData({ selectedCell: [row, col] })
  },

  // 输入数字
  handleNumberInput(e) {
    const num = e.currentTarget.dataset.num
    const { selectedCell, initialGrid, grid } = this.data

    if (!selectedCell) return
    if (initialGrid[selectedCell[0]][selectedCell[1]]) return

    const [row, col] = selectedCell
    const newGrid = [...grid]
    newGrid[row][col] = num

    this.setData({ grid: newGrid })

    // 检查是否完成
    this.checkWin()
  },

  // 擦除单元格
  eraseCell() {
    const { selectedCell, initialGrid, grid } = this.data

    if (!selectedCell) return
    if (initialGrid[selectedCell[0]][selectedCell[1]]) return

    const [row, col] = selectedCell
    const newGrid = [...grid]
    newGrid[row][col] = ''

    this.setData({ grid: newGrid })
  },

  // 检查是否获胜
  checkWin() {
    const { grid } = this.data

    // 检查所有单元格是否都已填满
    const isFull = grid.every(row => row.every(cell => cell !== '' && cell !== null))

    if (isFull) {
      this.setData({ isWin: true })
      wx.showToast({ title: '解谜成功！', icon: 'success' })
    }
  },

  // 显示/隐藏规则
  toggleInfo() {
    this.setData({ showInfo: !this.data.showInfo })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  }
})