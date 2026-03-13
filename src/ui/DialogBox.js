/**
 * DialogBox.js - 通用对话框组件
 * 支持文字逐字显示动画
 */
class DialogBox {
  constructor(canvas) {
    this.canvas = canvas;
    this.W = canvas.width;
    this.H = canvas.height;

    // 对话框尺寸（底部区域）
    this.boxX = 4;
    this.boxY = this.H - 56;
    this.boxW = this.W - 8;
    this.boxH = 52;
    this.padding = 8;

    // 文字
    this.fullText = '';
    this.displayText = '';
    this.charIndex = 0;
    this.charSpeed = 40; // 字符/秒
    this.charTimer = 0;
    this.isComplete = false;

    // 显示控制
    this.visible = false;

    // 翻页箭头动画
    this.arrowTimer = 0;
    this.arrowVisible = false;
  }

  show(text) {
    this.fullText = text;
    this.displayText = '';
    this.charIndex = 0;
    this.charTimer = 0;
    this.isComplete = false;
    this.visible = true;
    this.arrowVisible = false;
  }

  hide() {
    this.visible = false;
  }

  update(dt) {
    if (!this.visible || this.isComplete) {
      this.arrowTimer += dt;
      if (this.arrowTimer >= 0.4) {
        this.arrowTimer = 0;
        this.arrowVisible = !this.arrowVisible;
      }
      return;
    }

    this.charTimer += dt;
    const charsToAdd = Math.floor(this.charTimer * this.charSpeed);
    if (charsToAdd > 0) {
      this.charTimer -= charsToAdd / this.charSpeed;
      this.charIndex = Math.min(this.charIndex + charsToAdd, this.fullText.length);
      this.displayText = this.fullText.substring(0, this.charIndex);
      if (this.charIndex >= this.fullText.length) {
        this.isComplete = true;
      }
    }
  }

  /**
   * 跳过打字机动画，直接显示全部文字
   */
  skipAnimation() {
    this.charIndex = this.fullText.length;
    this.displayText = this.fullText;
    this.isComplete = true;
  }

  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);

    // 边框（像素风格双线）
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.boxX + 3, this.boxY + 3, this.boxW - 6, this.boxH - 6);

    // 文字
    ctx.fillStyle = '#000';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';

    const maxLineW = this.boxW - this.padding * 2;
    const lineHeight = 14;
    const lines = this._wrapText(ctx, this.displayText, maxLineW);

    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      ctx.fillText(lines[i], this.boxX + this.padding, this.boxY + this.padding + i * lineHeight);
    }

    // 翻页箭头（手动绘制三角形，ctx 无 fillTriangle API）
    if (this.isComplete && this.arrowVisible) {
      ctx.fillStyle = '#333';
      const arrowX = this.boxX + this.boxW - 14;
      const arrowY = this.boxY + this.boxH - 12;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX + 6, arrowY);
      ctx.lineTo(arrowX + 3, arrowY + 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

window.DialogBox = DialogBox;
