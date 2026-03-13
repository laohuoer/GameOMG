/**
 * GameLoop.js - requestAnimationFrame 主循环管理器
 */
class GameLoop {
  constructor() {
    this.running = false;
    this.lastTime = 0;
    this.fps = 60;
    this.frameInterval = 1000 / this.fps;
    this.rafId = null;
    this.updateCallback = null;
    this.renderCallback = null;
    this.accumulatedTime = 0;
    this.fixedDt = 1 / 60;
  }

  start(updateFn, renderFn) {
    this.updateCallback = updateFn;
    this.renderCallback = renderFn;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop.bind(this));
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _loop(timestamp) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this._loop.bind(this));

    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 防止长时间 tab 切换后突然大 dt
    const dt = Math.min(elapsed / 1000, 0.1);

    this.accumulatedTime += dt;

    // 固定步长更新
    while (this.accumulatedTime >= this.fixedDt) {
      if (this.updateCallback) this.updateCallback(this.fixedDt);
      this.accumulatedTime -= this.fixedDt;
    }

    if (this.renderCallback) this.renderCallback();
  }
}

window.GameLoop = GameLoop;
