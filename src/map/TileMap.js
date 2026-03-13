/**
 * TileMap.js - Tilemap 渲染与碰撞检测
 * 读取 JSON 格式地图数据，支持多图层渲染
 *
 * 地图 JSON 格式（自定义简洁格式）:
 * {
 *   "id": "town",
 *   "width": 20,       // 地图列数
 *   "height": 15,      // 地图行数
 *   "tileWidth": 16,
 *   "tileHeight": 16,
 *   "layers": [
 *     { "name": "ground",    "visible": true, "data": [...] },
 *     { "name": "decor",     "visible": true, "data": [...] },
 *     { "name": "collision", "visible": false, "data": [...] },
 *     { "name": "trigger",   "visible": false, "data": [...] }
 *   ],
 *   "triggers": [
 *     { "x": 5, "y": 14, "type": "warp", "target": "route1", "targetX": 5, "targetY": 1 },
 *     { "x": 3, "y": 5,  "type": "grass", "encounterRate": 0.15 }
 *   ]
 * }
 */
class TileMap {
  constructor(tileSet) {
    this.tileSet = tileSet;
    this.mapData = null;
    this.layers = {};
    this.width = 0;
    this.height = 0;
    this.tileWidth = 16;
    this.tileHeight = 16;

    // 摄像机
    this.cameraX = 0;
    this.cameraY = 0;

    // 离屏 Canvas 用于缓存地面层渲染
    this._groundCache = null;
    this._groundCacheDirty = true;
  }

  /**
   * 加载地图数据
   */
  load(mapData) {
    this.mapData = mapData;
    this.width = mapData.width;
    this.height = mapData.height;
    this.tileWidth = mapData.tileWidth || 16;
    this.tileHeight = mapData.tileHeight || 16;

    // 将图层按 name 索引
    this.layers = {};
    if (mapData.layers) {
      for (const layer of mapData.layers) {
        this.layers[layer.name] = layer;
      }
    }

    this._groundCacheDirty = true;
    this._buildGroundCache();
  }

  /**
   * 将地面层预渲染到离屏 Canvas
   */
  _buildGroundCache() {
    const pw = this.width * this.tileWidth;
    const ph = this.height * this.tileHeight;
    this._groundCache = document.createElement('canvas');
    this._groundCache.width = pw;
    this._groundCache.height = ph;
    const cacheCtx = this._groundCache.getContext('2d');
    this._renderLayerToCtx(cacheCtx, 'ground');
    this._renderLayerToCtx(cacheCtx, 'decor');
    this._groundCacheDirty = false;
  }

  _renderLayerToCtx(ctx, layerName) {
    const layer = this.layers[layerName];
    if (!layer || !layer.data) return;
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const tileId = layer.data[row * this.width + col];
        if (tileId > 0) {
          this.tileSet.drawTile(
            ctx, tileId,
            col * this.tileWidth,
            row * this.tileHeight,
            this.tileWidth, this.tileHeight
          );
        }
      }
    }
  }

  /**
   * 更新摄像机，跟随玩家
   * @param {number} px 玩家世界坐标 x（像素）
   * @param {number} py 玩家世界坐标 y（像素）
   * @param {number} viewW 视口宽度
   * @param {number} viewH 视口高度
   */
  updateCamera(px, py, viewW, viewH) {
    this.cameraX = px - viewW / 2;
    this.cameraY = py - viewH / 2;

    // 边缘锁定
    const maxCamX = this.width * this.tileWidth - viewW;
    const maxCamY = this.height * this.tileHeight - viewH;
    this.cameraX = Math.max(0, Math.min(this.cameraX, maxCamX));
    this.cameraY = Math.max(0, Math.min(this.cameraY, maxCamY));
  }

  /**
   * 渲染可见区域
   */
  render(ctx) {
    if (!this.mapData) return;
    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));

    // 绘制地面+装饰缓存层
    if (this._groundCache) {
      ctx.drawImage(this._groundCache, 0, 0);
    }

    ctx.restore();
  }

  /**
   * 渲染上层（装饰/顶层遮挡玩家的部分）
   * 如果有 "overlay" 图层，在玩家绘制之后再绘制
   */
  renderOverlay(ctx) {
    if (!this.mapData || !this.layers['overlay']) return;
    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));
    this._renderLayerToCtx(ctx, 'overlay');
    ctx.restore();
  }

  /**
   * 碰撞检测：给定世界坐标（瓦片坐标），是否可以行走
   * @param {number} tileX
   * @param {number} tileY
   */
  isWalkable(tileX, tileY) {
    // 边界检查
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return false;
    }
    const collisionLayer = this.layers['collision'];
    if (!collisionLayer || !collisionLayer.data) return true;
    const tileId = collisionLayer.data[tileY * this.width + tileX];
    return tileId === 0; // 0 = 可行走，非0 = 碰撞
  }

  /**
   * 获取指定瓦片坐标的触发器
   */
  getTrigger(tileX, tileY) {
    if (!this.mapData || !this.mapData.triggers) return null;
    return this.mapData.triggers.find(t => t.x === tileX && t.y === tileY) || null;
  }

  /**
   * 世界像素坐标 → 瓦片坐标
   */
  pixelToTile(px, py) {
    return {
      x: Math.floor(px / this.tileWidth),
      y: Math.floor(py / this.tileHeight),
    };
  }

  /**
   * 瓦片坐标 → 世界像素坐标（瓦片左上角）
   */
  tileToPixel(tx, ty) {
    return {
      x: tx * this.tileWidth,
      y: ty * this.tileHeight,
    };
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(wx, wy) {
    return {
      x: wx - this.cameraX,
      y: wy - this.cameraY,
    };
  }

  /**
   * 判断某瓦片是否是草丛
   */
  isGrassTile(tileX, tileY) {
    const trigger = this.getTrigger(tileX, tileY);
    return trigger && trigger.type === 'grass';
  }

  get pixelWidth() { return this.width * this.tileWidth; }
  get pixelHeight() { return this.height * this.tileHeight; }
}

window.TileMap = TileMap;
