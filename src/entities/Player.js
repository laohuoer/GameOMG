/**
 * Player.js - 玩家角色
 * 处理移动、动画、背包、队伍管理
 */
class Player {
  constructor(config = {}) {
    // 世界瓦片坐标
    this.tileX = config.tileX || 7;
    this.tileY = config.tileY || 10;

    // 像素坐标（用于平滑移动插值）
    this.tileWidth = config.tileWidth || 16;
    this.tileHeight = config.tileHeight || 16;
    this.pixelX = this.tileX * this.tileWidth;
    this.pixelY = this.tileY * this.tileHeight;

    // 目标像素坐标（插值目标）
    this.targetPixelX = this.pixelX;
    this.targetPixelY = this.pixelY;

    // 移动速度（格/秒）
    this.moveSpeed = config.moveSpeed || 5;
    this.isMoving = false;
    this.moveTimer = 0;
    this.moveDuration = 1 / this.moveSpeed;

    // 朝向: 'down' | 'up' | 'left' | 'right'
    this.facing = 'down';

    // 行走动画帧
    this.walkFrame = 0;
    this.walkFrameTimer = 0;
    this.walkFrameInterval = 0.15; // 秒
    this.walkFrameCount = 4;

    // 移动输入冷却（防止连续移动太快）
    this.moveCooldown = 0;
    this.moveCooldownMax = this.moveDuration;

    // 玩家信息
    this.name = config.name || '小智';
    this.steps = config.steps || 0;

    // 队伍（最多6只宝可梦）
    this.team = config.team || [];

    // 背包
    this.bag = config.bag || {
      pokeballs: { poke_ball: 5, great_ball: 0, ultra_ball: 0 },
      medicine: { potion: 3, super_potion: 0, antidote: 1 },
      stones: {},
      keyItems: {},
    };

    // 金钱
    this.money = config.money || 3000;

    // 当前地图 ID
    this.mapId = config.mapId || 'town';

    // 精灵图（行走图）
    this._spriteImg = null;
    this._loadSprite();
  }

  _loadSprite() {
    const img = new Image();
    img.onload = () => { this._spriteImg = img; };
    img.src = 'assets/characters/player.png';
  }

  /**
   * 每帧更新
   * @param {number} dt 帧时间（秒）
   * @param {InputManager} input
   * @param {TileMap} tileMap
   * @param {function} onTileChange 踩到新瓦片的回调
   */
  update(dt, input, tileMap, onTileChange) {
    this.moveCooldown -= dt;

    if (this.isMoving) {
      this._updateMovement(dt, onTileChange);
    } else if (this.moveCooldown <= 0) {
      this._handleInput(input, tileMap, onTileChange);
    }

    // 行走动画
    if (this.isMoving) {
      this.walkFrameTimer += dt;
      if (this.walkFrameTimer >= this.walkFrameInterval) {
        this.walkFrameTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % this.walkFrameCount;
      }
    } else {
      this.walkFrame = 0;
    }
  }

  _handleInput(input, tileMap, onTileChange) {
    const dir = input.getDirection();
    if (dir.x === 0 && dir.y === 0) return;

    let newTileX = this.tileX;
    let newTileY = this.tileY;

    if (dir.x < 0) { newTileX--; this.facing = 'left'; }
    else if (dir.x > 0) { newTileX++; this.facing = 'right'; }
    else if (dir.y < 0) { newTileY--; this.facing = 'up'; }
    else if (dir.y > 0) { newTileY++; this.facing = 'down'; }

    if (tileMap.isWalkable(newTileX, newTileY)) {
      this.tileX = newTileX;
      this.tileY = newTileY;
      this.targetPixelX = newTileX * this.tileWidth;
      this.targetPixelY = newTileY * this.tileHeight;
      this.isMoving = true;
      this.moveTimer = 0;
      this.steps++;
      this.moveCooldown = this.moveCooldownMax;
    }
  }

  _updateMovement(dt, onTileChange) {
    this.moveTimer += dt;
    const t = Math.min(this.moveTimer / this.moveDuration, 1);

    // 线性插值（简单流畅）
    const startX = this.targetPixelX - (this.facing === 'left' ? -this.tileWidth : this.facing === 'right' ? this.tileWidth : 0);
    const startY = this.targetPixelY - (this.facing === 'up' ? -this.tileHeight : this.facing === 'down' ? this.tileHeight : 0);

    this.pixelX = startX + (this.targetPixelX - startX) * t;
    this.pixelY = startY + (this.targetPixelY - startY) * t;

    if (t >= 1) {
      this.pixelX = this.targetPixelX;
      this.pixelY = this.targetPixelY;
      this.isMoving = false;
      this.moveTimer = 0;
      // 到达新瓦片
      if (onTileChange) onTileChange(this.tileX, this.tileY);
    }
  }

  /**
   * 渲染玩家
   */
  render(ctx, tileMap) {
    const screen = tileMap.worldToScreen(this.pixelX, this.pixelY);
    const sx = screen.x;
    const sy = screen.y;

    if (this._spriteImg) {
      const dirIndex = { 'down': 0, 'left': 1, 'right': 2, 'up': 3 }[this.facing];
      const frameX = this.walkFrame * 16;
      const frameY = dirIndex * 16;
      ctx.drawImage(
        this._spriteImg,
        frameX, frameY, 16, 16,
        Math.floor(sx), Math.floor(sy), 16, 16
      );
    } else {
      // 占位矩形
      this._renderPlaceholder(ctx, sx, sy);
    }
  }

  _renderPlaceholder(ctx, x, y) {
    ctx.fillStyle = '#ff0';
    ctx.fillRect(Math.floor(x) + 2, Math.floor(y) + 1, 12, 14);
    // 脸
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(Math.floor(x) + 4, Math.floor(y) + 3, 8, 6);
    // 眼睛
    ctx.fillStyle = '#000';
    const eyeOffset = this.facing === 'up' ? 8 : 0;
    if (this.facing !== 'up') {
      ctx.fillRect(Math.floor(x) + 5, Math.floor(y) + 4, 2, 2);
      ctx.fillRect(Math.floor(x) + 9, Math.floor(y) + 4, 2, 2);
    }
  }

  /**
   * 背包操作
   */
  hasItem(category, itemId) {
    return this.bag[category] && (this.bag[category][itemId] || 0) > 0;
  }

  useItem(category, itemId) {
    if (!this.hasItem(category, itemId)) return false;
    this.bag[category][itemId]--;
    return true;
  }

  addItem(category, itemId, amount = 1) {
    if (!this.bag[category]) this.bag[category] = {};
    this.bag[category][itemId] = (this.bag[category][itemId] || 0) + amount;
  }

  /**
   * 队伍管理
   */
  addPokemonToTeam(pokemon) {
    if (this.team.length < 6) {
      this.team.push(pokemon);
      return true;
    }
    return false;
  }

  getFirstAlivePokemon() {
    return this.team.find(p => !p.isFainted) || null;
  }

  /**
   * 序列化
   */
  toJSON() {
    return {
      name: this.name,
      position: { mapId: this.mapId, x: this.tileX, y: this.tileY },
      steps: this.steps,
      money: this.money,
    };
  }
}

window.Player = Player;
