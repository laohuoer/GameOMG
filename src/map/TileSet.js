/**
 * TileSet.js - 瓦片集管理
 * 管理 tileset 图像，提供从瓦片 ID 到图像坐标的映射
 */
class TileSet {
  /**
   * @param {HTMLImageElement} image  瓦片集图片
   * @param {number} tileWidth  单个瓦片宽度（像素）
   * @param {number} tileHeight 单个瓦片高度（像素）
   */
  constructor(image, tileWidth = 16, tileHeight = 16) {
    this.image = image;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.columns = image ? Math.floor(image.width / tileWidth) : 16;
    this.rows = image ? Math.floor(image.height / tileHeight) : 16;
  }

  /**
   * 获取瓦片在 tileset 图中的像素坐标
   * @param {number} tileId  从 0 开始的瓦片 ID（0 = 第1行第1列）
   * @returns {{ sx, sy, sw, sh }}
   */
  getTileRect(tileId) {
    if (tileId <= 0) return null;
    const id = tileId - 1; // tilemap 中 0 = 空，1 = 第一块
    const col = id % this.columns;
    const row = Math.floor(id / this.columns);
    return {
      sx: col * this.tileWidth,
      sy: row * this.tileHeight,
      sw: this.tileWidth,
      sh: this.tileHeight,
    };
  }

  /**
   * 将单个瓦片绘制到 Canvas
   */
  drawTile(ctx, tileId, dx, dy, dw = this.tileWidth, dh = this.tileHeight) {
    if (!this.image || tileId <= 0) return;
    const rect = this.getTileRect(tileId);
    if (!rect) return;
    ctx.drawImage(
      this.image,
      rect.sx, rect.sy, rect.sw, rect.sh,
      Math.floor(dx), Math.floor(dy), dw, dh
    );
  }
}

window.TileSet = TileSet;
