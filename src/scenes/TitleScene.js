/**
 * TitleScene.js - 标题/开始界面
 */
class TitleScene {
  constructor(canvas, sceneManager, saveManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sceneManager = sceneManager;
    this.saveManager = saveManager;
    this.W = canvas.width;
    this.H = canvas.height;

    // 标题动画
    this._titleY = -40;
    this._titleTargetY = this.H * 0.2;
    this._animDone = false;
    this._flashTimer = 0;
    this._flashVisible = true;

    // 菜单选项
    this.menuItems = ['新游戏', '继续游戏', '关于'];
    this.selectedIndex = 0;
    this.menuVisible = false;
    this._menuTimer = 0;

    // 闪烁文字
    this._pressATimer = 0;
    this._pressAVisible = true;
    this._waitingPress = true;

    // 存档信息
    this.saveSlotInfo = null;

    // 宝可梦走动动画背景
    this._bgPokemons = this._initBgPokemons();

    // 输入防重复
    this._lastKey = null;
    this._keyTimer = 0;
    this._keyRepeat = 0.15;
  }

  onEnter(params) {
    this.saveSlotInfo = this.saveManager.getSlotsInfo();
    this._titleY = -40;
    this._animDone = false;
    this._waitingPress = true;
    this.menuVisible = false;
    this.selectedIndex = 0;
  }

  onExit() {}

  update(dt, input) {
    // 标题滑入动画
    if (!this._animDone) {
      this._titleY += (this._titleTargetY - this._titleY) * 6 * dt;
      if (Math.abs(this._titleY - this._titleTargetY) < 1) {
        this._titleY = this._titleTargetY;
        this._animDone = true;
      }
    }

    // 闪烁文字
    this._pressATimer += dt;
    if (this._pressATimer > 0.6) {
      this._pressATimer = 0;
      this._pressAVisible = !this._pressAVisible;
    }

    // 背景宝可梦移动
    for (const p of this._bgPokemons) {
      p.x += p.speed * dt;
      if (p.x > this.W + 30) p.x = -30;
    }

    // 输入处理
    this._keyTimer -= dt;

    if (this._waitingPress) {
      if (input.isActionJustPressed('a') || input.isActionJustPressed('start')) {
        this._waitingPress = false;
        this.menuVisible = true;
        this._menuTimer = 0;
      }
    } else if (this.menuVisible) {
      const dir = input.getDirection();
      if (dir.y !== 0 && this._keyTimer <= 0) {
        this.selectedIndex = (this.selectedIndex + (dir.y > 0 ? 1 : -1) + this.menuItems.length) % this.menuItems.length;
        this._keyTimer = this._keyRepeat;
      }
      if (input.isActionJustPressed('a')) {
        this._handleMenuSelect();
      }
    }
  }

  _handleMenuSelect() {
    switch (this.selectedIndex) {
      case 0: // 新游戏
        this._startNewGame();
        break;
      case 1: // 继续游戏
        this._loadGame();
        break;
      case 2: // 关于
        // 简单提示
        break;
    }
  }

  _startNewGame() {
    const saveData = this.saveManager.createDefaultSave('小智');
    this.saveManager.save(0, saveData);
    this.sceneManager.switchTo('world', { saveData });
  }

  _loadGame() {
    const saves = this.saveManager.getSlotsInfo();
    const slot = saves.find(s => s.exists);
    if (slot) {
      const saveData = this.saveManager.load(slot.slot);
      this.sceneManager.switchTo('world', { saveData });
    } else {
      // 没有存档，新游戏
      this._startNewGame();
    }
  }

  render(ctx) {
    // 渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, '#1a1a6e');
    grad.addColorStop(0.5, '#2a2a9e');
    grad.addColorStop(1, '#1a1a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // 星空
    this._drawStars(ctx);

    // 背景宝可梦
    this._drawBgPokemons(ctx);

    // 标题
    this._drawTitle(ctx);

    // 按键提示 / 菜单
    if (!this.menuVisible) {
      if (this._animDone && this._pressAVisible) {
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('按 Z / Enter 开始', this.W / 2, this.H * 0.72);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }
    } else {
      this._drawMenu(ctx);
    }

    // 版权
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('数据来源: PokéAPI  |  仅供学习交流', this.W / 2, this.H - 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  _drawTitle(ctx) {
    // 阴影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('口袋妖怪', this.W / 2 + 3, this._titleY + 3);
    ctx.fillText('像素冒险', this.W / 2 + 3, this._titleY + 32);

    // 主标题（红色描边效果）
    ctx.strokeStyle = '#990000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.strokeText('口袋妖怪', this.W / 2, this._titleY);
    ctx.strokeText('像素冒险', this.W / 2, this._titleY + 32);

    ctx.fillStyle = '#ffdd00';
    ctx.fillText('口袋妖怪', this.W / 2, this._titleY);
    ctx.fillStyle = '#ff4444';
    ctx.fillText('像素冒险', this.W / 2, this._titleY + 32);

    ctx.restore();
  }

  _drawMenu(ctx) {
    const menuX = this.W / 2;
    const menuStartY = this.H * 0.6;

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.menuItems.length; i++) {
      const y = menuStartY + i * 24;
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#ffdd00';
        ctx.fillText('▶ ' + this.menuItems[i], menuX, y);
      } else {
        ctx.fillStyle = '#ccc';
        ctx.fillText(this.menuItems[i], menuX, y);
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  _drawStars(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    // 固定的星星位置（用确定性随机）
    const starPositions = [
      [30,20],[80,15],[150,8],[210,25],[280,12],[350,18],[420,9],[460,22],
      [50,45],[120,38],[190,50],[260,35],[330,48],[400,42],[450,30],
      [10,70],[90,65],[160,72],[230,60],[300,68],[380,75],[440,62],
    ];
    for (const [x, y] of starPositions) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  _initBgPokemons() {
    const types = [
      { label: '♥', color: '#ff8888', size: 14 },
      { label: '★', color: '#ffdd00', size: 12 },
      { label: '◆', color: '#88ccff', size: 10 },
    ];
    return Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * 500,
      y: this.H * (0.8 + Math.random() * 0.12),
      speed: 15 + Math.random() * 20,
      ...types[i % types.length],
    }));
  }

  _drawBgPokemons(ctx) {
    ctx.save();
    for (const p of this._bgPokemons) {
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px "Press Start 2P", monospace`;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.3;
      ctx.fillText(p.label, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

window.TitleScene = TitleScene;
