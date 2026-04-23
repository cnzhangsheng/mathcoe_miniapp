// pages/game/hanoi/hanoi.js - 100%复刻 Hanoi.tsx
Page({
  data: {
    numDisks: 3,
    towers: [[], [], []],
    selectedTower: null,
    moves: 0,
    isWin: false,
    showInfo: false,
    optimalMoves: 7 // 2^n - 1
  },

  onLoad() {
    this.resetGame()
  },

  // 计算最佳步数
  calculateOptimalMoves(numDisks) {
    return Math.pow(2, numDisks) - 1
  },

  // 重置游戏
  resetGame() {
    const numDisks = this.data.numDisks
    const initialDisks = Array.from({ length: numDisks }, (_, i) => numDisks - i)
    this.setData({
      towers: [initialDisks, [], []],
      selectedTower: null,
      moves: 0,
      isWin: false,
      optimalMoves: this.calculateOptimalMoves(numDisks)
    })
  },

  // 增加圆盘数量
  increaseDisks() {
    if (this.data.numDisks < 6) {
      this.setData({ numDisks: this.data.numDisks + 1 })
      this.resetGame()
    }
  },

  // 减少圆盘数量
  decreaseDisks() {
    if (this.data.numDisks > 3) {
      this.setData({ numDisks: this.data.numDisks - 1 })
      this.resetGame()
    }
  },

  // 点击塔柱
  handleTowerClick(e) {
    const towerIndex = e.currentTarget.dataset.index
    const { towers, selectedTower, isWin } = this.data

    if (isWin) return

    if (selectedTower === null) {
      // 选择塔柱（需要有圆盘）
      if (towers[towerIndex].length > 0) {
        this.setData({ selectedTower: towerIndex })
      }
    } else {
      // 尝试移动圆盘
      if (selectedTower === towerIndex) {
        // 点击同一个塔柱，取消选择
        this.setData({ selectedTower: null })
        return
      }

      const diskToMove = towers[selectedTower][towers[selectedTower].length - 1]
      const targetTowerTopDisk = towers[towerIndex][towers[towerIndex].length - 1]

      // 检查是否可以移动（目标塔顶的圆盘必须比要移动的圆盘大）
      if (targetTowerTopDisk === undefined || diskToMove < targetTowerTopDisk) {
        const newTowers = [...towers]
        newTowers[selectedTower] = towers[selectedTower].slice(0, -1)
        newTowers[towerIndex] = [...towers[towerIndex], diskToMove]

        const newMoves = this.data.moves + 1

        // 检查是否获胜（所有圆盘都在第三个塔上）
        const isWin = towerIndex === 2 && newTowers[2].length === this.data.numDisks

        this.setData({
          towers: newTowers,
          moves: newMoves,
          selectedTower: null,
          isWin
        })

        if (isWin) {
          wx.showToast({ title: '挑战成功！', icon: 'success' })
        }
      } else {
        // 无效移动，取消选择
        this.setData({ selectedTower: null })
        wx.showToast({ title: '不能移动', icon: 'error' })
      }
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