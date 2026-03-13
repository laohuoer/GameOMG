/**
 * BattleUI.js - 战斗界面渲染
 * 负责绘制 HP 条、技能菜单、捕捉动画等
 */
class BattleUI {
  constructor(canvas) {
    this.canvas = canvas;
    this.W = canvas.width;   // 480
    this.H = canvas.height;  // 320

    // 对话框
    this.dialogBox = new DialogBox(canvas);

    // 动画状态
    this._spriteShakeTimer = 0;
    this._spriteShaking = null; // 'player' | 'enemy' | null

    // 精灵球动画
    this._ballAnim = {
      active: false,
      x: 0, y: 0,
      targetX: 0, targetY: 0,
      phase: 0,
      timer: 0,
      shakes: 0,
      shakeAngle: 0,
    };

    // 进化动画
    this._evoAnim = {
      active: false,
      flash: false,
      timer: 0,
      duration: 3,
    };

    // HP 条动画
    this._playerHPAnim = 1;
    this._enemyHPAnim = 1;

    // 经验条动画
    this._expAnim = 0;

    // 菜单选项
    this.menuOptions = ['战斗', '背包', '宝可梦', '逃跑'];
  }

  update(dt, battleSystem) {
    this.dialogBox.update(dt);

    // HP 条平滑动画
    if (battleSystem) {
      const pp = battleSystem.playerPokemon;
      const ep = battleSystem.enemyPokemon;
      if (pp) {
        const targetHP = pp.currentHP / pp.stats.hp;
        this._playerHPAnim += (targetHP - this._playerHPAnim) * 5 * dt;
      }
      if (ep) {
        const targetHP = ep.currentHP / ep.stats.hp;
        this._enemyHPAnim += (targetHP - this._enemyHPAnim) * 5 * dt;
      }
    }

    // 精灵抖动
    if (this._spriteShaking) {
      this._spriteShakeTimer += dt;
      if (this._spriteShakeTimer > 0.3) {
        this._spriteShakeTimer = 0;
        this._spriteShaking = null;
      }
    }

    // 精灵球动画
    if (this._ballAnim.active) {
      this._ballAnim.timer += dt;
    }
  }

  render(ctx, battleSystem) {
    if (!battleSystem) return;
    const { playerPokemon, enemyPokemon, state } = battleSystem;
    const BS = BattleSystem.STATES;

    // 背景
    this._drawBackground(ctx);

    // 敌方区域（上半部分）
    if (enemyPokemon) {
      this._drawEnemyArea(ctx, enemyPokemon, battleSystem);
    }

    // 己方区域（下半部分）
    if (playerPokemon) {
      this._drawPlayerArea(ctx, playerPokemon, battleSystem);
    }

    // UI 菜单区域（底部）
    this._drawBattleMenu(ctx, battleSystem);

    // 对话框
    if (state === BS.MESSAGE || state === BS.ENTER) {
      this.dialogBox.show(battleSystem.currentMessage);
      this.dialogBox.render(ctx);
    }

    // 捕捉动画
    if (state === BS.CATCH_ANIMATION) {
      this._drawCatchAnimation(ctx, battleSystem);
    }

    // 进化动画
    if (state === BS.EVOLUTION) {
      this._drawEvolutionAnimation(ctx, battleSystem);
    }
  }

  _drawBackground(ctx) {
    // 战斗背景（草地风格）
    ctx.fillStyle = '#78c878';
    ctx.fillRect(0, 0, this.W, this.H / 2);
    ctx.fillStyle = '#e8e0a0';
    ctx.fillRect(0, this.H / 2, this.W, this.H / 2);

    // 草丛装饰线
    ctx.strokeStyle = '#56a856';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 80;
      ctx.beginPath();
      ctx.moveTo(x, this.H * 0.45);
      ctx.lineTo(x + 4, this.H * 0.45 - 8);
      ctx.lineTo(x + 8, this.H * 0.45);
      ctx.stroke();
    }

    // 地面平台（敌方）
    ctx.fillStyle = '#c8b878';
    this._drawEllipse(ctx, 340, 110, 90, 18);

    // 地面平台（己方）
    ctx.fillStyle = '#a89048';
    this._drawEllipse(ctx, 120, 210, 90, 18);
  }

  _drawEllipse(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawEnemyArea(ctx, pokemon, battleSystem) {
    // 精灵图
    const sprite = pokemon.getSprite(false);
    const baseX = 300;
    const baseY = 50;

    let shakeX = 0;
    if (this._spriteShaking === 'enemy') {
      shakeX = Math.sin(this._spriteShakeTimer * 60) * 4;
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const size = 80;
      ctx.drawImage(sprite, baseX + shakeX, baseY - size, size, size);
    } else {
      this._drawPokemonPlaceholder(ctx, pokemon, baseX + shakeX, baseY - 80, 80);
    }

    // 信息面板（左上）
    this._drawInfoPanel(ctx, pokemon, 8, 12, false, this._enemyHPAnim);
  }

  _drawPlayerArea(ctx, pokemon, battleSystem) {
    // 后视精灵图
    const sprite = pokemon.getSprite(true);
    const baseX = 80;
    const baseY = 200;

    let shakeX = 0;
    if (this._spriteShaking === 'player') {
      shakeX = Math.sin(this._spriteShakeTimer * 60) * 4;
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const size = 96;
      ctx.drawImage(sprite, baseX + shakeX - size / 2, baseY - size, size, size);
    } else {
      this._drawPokemonPlaceholder(ctx, pokemon, baseX + shakeX - 40, baseY - 80, 80);
    }

    // 信息面板（右下）
    this._drawInfoPanel(ctx, pokemon, this.W - 190, this.H * 0.5 + 8, true, this._playerHPAnim);
  }

  _drawInfoPanel(ctx, pokemon, x, y, showHP, hpAnimValue) {
    const panelW = 180;
    const panelH = showHP ? 70 : 55;

    // 面板背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, panelW, panelH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, panelW, panelH);

    // 宝可梦名称
    ctx.fillStyle = '#000';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(pokemon.displayName, x + 6, y + 6);

    // 等级
    ctx.fillText(`Lv.${pokemon.level}`, x + panelW - 50, y + 6);

    // 异常状态标签
    if (pokemon.status) {
      const color = StatusEffect.getColor(pokemon.status);
      const label = StatusEffect.getLabel(pokemon.status);
      ctx.fillStyle = color;
      ctx.fillRect(x + 6, y + 18, 24, 10);
      ctx.fillStyle = '#fff';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(label, x + 7, y + 19);
      ctx.font = '8px "Press Start 2P", monospace';
    }

    // HP 条
    const hpBarX = x + 30;
    const hpBarY = y + 32;
    const hpBarW = panelW - 38;
    const hpBarH = 6;

    ctx.fillStyle = '#555';
    ctx.fillText('HP', x + 6, y + 30);

    // 背景条
    ctx.fillStyle = '#bbb';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // HP 颜色（根据百分比）
    const pct = hpAnimValue;
    let hpColor;
    if (pct > 0.5) hpColor = '#3cb034';
    else if (pct > 0.2) hpColor = '#f8c030';
    else hpColor = '#e83030';

    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, Math.floor(hpBarW * Math.max(0, pct)), hpBarH);

    // 边框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // 显示具体 HP 数值（己方面板）
    if (showHP) {
      ctx.fillStyle = '#000';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`${pokemon.currentHP}/${pokemon.stats.hp}`, x + 6, y + 44);

      // 经验条
      const expBarX = x + 6;
      const expBarY = y + 60;
      const expBarW = panelW - 12;

      ctx.fillStyle = '#bbb';
      ctx.fillRect(expBarX, expBarY, expBarW, 4);

      const expPct = pokemon.experience / pokemon._calcExpToNext(pokemon.level + 1);
      ctx.fillStyle = '#48b0d0';
      ctx.fillRect(expBarX, expBarY, Math.floor(expBarW * Math.min(1, expPct)), 4);

      ctx.strokeStyle = '#555';
      ctx.strokeRect(expBarX, expBarY, expBarW, 4);
    }
  }

  _drawPokemonPlaceholder(ctx, pokemon, x, y, size) {
    // 用颜色方块代表宝可梦（无精灵图时）
    const typeColors = {
      normal: '#a8a878', fire: '#f08030', water: '#6890f0',
      grass: '#78c850', electric: '#f8d030', ice: '#98d8d8',
      fighting: '#c03028', poison: '#a040a0', ground: '#e0c068',
      flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
      rock: '#b8a038', ghost: '#705898', dragon: '#7038f8',
      dark: '#705848', steel: '#b8b8d0', fairy: '#ee99ac',
    };
    const type = pokemon.types[0] || 'normal';
    ctx.fillStyle = typeColors[type] || '#888';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(size / 5)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pokemon.displayName.substring(0, 4), x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  _drawBattleMenu(ctx, battleSystem) {
    const BS = BattleSystem.STATES;
    const { state, selectedMenuIndex, selectedMoveIndex, playerPokemon } = battleSystem;

    if (state === BS.PLAYER_MENU) {
      this._drawMainMenu(ctx, selectedMenuIndex);
    } else if (state === BS.SELECT_MOVE) {
      this._drawMoveMenu(ctx, playerPokemon, selectedMoveIndex);
    } else if (state === BS.MESSAGE || state === BS.ENTER) {
      // 对话框模式，无菜单
    } else if (state === BS.CATCH_ANIMATION) {
      // 显示捕捉动画
    }
  }

  _drawMainMenu(ctx, selectedIndex) {
    const menuX = this.W / 2 + 4;
    const menuY = this.H - 56;
    const menuW = this.W / 2 - 8;
    const menuH = 52;

    // 对话框区域（左半部分）
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, menuY, menuX - 12, menuH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, menuY, menuX - 12, menuH);
    ctx.fillStyle = '#333';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('どうする？', 12, menuY + 18);

    // 菜单框（右半部分）
    ctx.fillStyle = '#fff';
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(menuX, menuY, menuW, menuH);

    // 2x2 菜单
    const opts = this.menuOptions;
    for (let i = 0; i < opts.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ox = menuX + 10 + col * (menuW / 2);
      const oy = menuY + 10 + row * 22;

      if (i === selectedIndex) {
        ctx.fillStyle = '#cc0000';
      } else {
        ctx.fillStyle = '#000';
      }
      ctx.fillText((i === selectedIndex ? '▶ ' : '  ') + opts[i], ox, oy);
    }
  }

  _drawMoveMenu(ctx, pokemon, selectedIndex) {
    const menuX = 4;
    const menuY = this.H - 80;
    const menuW = this.W - 8;
    const menuH = 76;

    ctx.fillStyle = '#fff';
    ctx.fillRect(menuX, menuY, menuW, menuH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(menuX, menuY, menuW, menuH);

    const moves = pokemon.moves;
    const colW = menuW / 2;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ox = menuX + 12 + col * colW;
      const oy = menuY + 10 + row * 28;

      if (i === selectedIndex) {
        ctx.fillStyle = '#cc0000';
      } else {
        ctx.fillStyle = '#000';
      }
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText((i === selectedIndex ? '▶ ' : '  ') + (move.displayName || move.name), ox, oy);

      // PP 信息
      ctx.fillStyle = '#555';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(`PP ${move.pp}/${move.maxPP || move.pp}`, ox + 12, oy + 14);
    }

    // 右侧显示选中技能信息
    if (moves[selectedIndex]) {
      const m = moves[selectedIndex];
      const infoX = menuX + menuW - 130;
      ctx.fillStyle = '#000';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(`属性: ${m.type}`, infoX, menuY + 10);
      ctx.fillText(`威力: ${m.power || '--'}`, infoX, menuY + 22);
      ctx.fillText(`命中: ${m.accuracy || '--'}`, infoX, menuY + 34);
    }
  }

  _drawCatchAnimation(ctx, battleSystem) {
    const { catchAnim, enemyPokemon } = battleSystem;
    if (catchAnim.phase >= 3) return;

    // 简单精灵球表示
    const bx = catchAnim.phase === 0 ? this.W * 0.3 : 330;
    const by = catchAnim.phase === 0 ? this.H - 80 : 90;

    const ballTimer = catchAnim.timer;
    const angle = Math.sin(ballTimer * 8) * (catchAnim.phase === 1 ? 0.3 : 0);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);

    // 精灵球图形
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(0, 0, 10, Math.PI, 0, false);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI, false);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.fillStyle = catchAnim.phase === 1 ? '#888' : '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();

    ctx.restore();
  }

  _drawEvolutionAnimation(ctx, battleSystem) {
    if (!battleSystem._evolutionData) return;
    const now = Date.now() / 1000;
    const flash = Math.sin(now * 10) > 0;

    if (flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    ctx.fillStyle = 'rgba(0,0,50,0.7)';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${battleSystem.playerPokemon.displayName}`, this.W / 2, this.H / 2 - 20);
    ctx.fillText('在进化！', this.W / 2, this.H / 2 + 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  /**
   * 触发精灵抖动动画（受到攻击时）
   */
  shakeSprite(who) {
    this._spriteShaking = who;
    this._spriteShakeTimer = 0;
  }

  setDialog(text) {
    this.dialogBox.show(text);
  }
}

window.BattleUI = BattleUI;
