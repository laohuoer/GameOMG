/**
 * HUD.js - 地图探索 HUD（步数、时间、小地图等）
 */
class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.W = canvas.width;
    this.H = canvas.height;

    // 计时（游戏内时间，秒）
    this.playTime = 0;
    this._visible = true;

    // 消息提示（短暂弹出）
    this._toast = null;
    this._toastTimer = 0;
    this._toastDuration = 2.5;
  }

  update(dt) {
    this.playTime += dt;

    if (this._toast) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0) {
        this._toast = null;
      }
    }
  }

  /**
   * 显示短暂提示消息
   */
  showToast(message) {
    this._toast = message;
    this._toastTimer = this._toastDuration;
  }

  render(ctx, player) {
    if (!this._visible) return;
    ctx.save();

    // 左上：地图名称（小标签）
    if (player) {
      this._drawMapLabel(ctx, player.mapId);
    }

    // 右上：游戏时间
    this._drawTime(ctx);

    // 底部 Toast 消息
    if (this._toast) {
      this._drawToast(ctx, this._toast, this._toastTimer / this._toastDuration);
    }

    ctx.restore();
  }

  _drawMapLabel(ctx, mapId) {
    const mapNames = {
      town: '真新镇',
      route1: '1号道路',
    };
    const name = mapNames[mapId] || mapId;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, 4, 90, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(name, 8, 7);
  }

  _drawTime(ctx) {
    const totalSeconds = Math.floor(this.playTime);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.W - 88, 4, 84, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(timeStr, this.W - 84, 7);
  }

  _drawToast(ctx, msg, alphaPct) {
    const alpha = Math.min(1, alphaPct * 4); // 快速淡入，缓慢保持
    const fadeOut = alphaPct < 0.15 ? alphaPct / 0.15 : 1;
    const finalAlpha = Math.min(alpha, fadeOut) * 0.9;

    ctx.globalAlpha = finalAlpha;
    const toastW = Math.min(msg.length * 8 + 20, this.W - 20);
    const toastX = (this.W - toastW) / 2;
    const toastY = this.H - 80;

    ctx.fillStyle = '#222';
    this._roundRect(ctx, toastX, toastY, toastW, 22, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg.substring(0, 30), this.W / 2, toastY + 11);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

window.HUD = HUD;
