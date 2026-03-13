/**
 * SceneManager.js - 场景切换管理器
 * 管理所有场景实例，支持淡入淡出切换
 */
class SceneManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scenes = {};
    this.currentScene = null;
    this.currentSceneName = '';

    // 淡入淡出
    this._fadeAlpha = 0;
    this._fadeDir = 0; // 1=淡出(变黑), -1=淡入(变清)
    this._fadeSpeed = 2.0;
    this._fadeDone = null;
    this._isFading = false;
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  /**
   * 切换场景（带淡入淡出）
   * @param {string} name
   * @param {object} params 传给 onEnter 的参数
   */
  switchTo(name, params = {}) {
    if (this._isFading) return;

    // 如果有当前场景，先淡出，再切换，再淡入
    if (this.currentScene) {
      this._fadeOut(() => {
        this._doSwitch(name, params);
        this._fadeIn();
      });
    } else {
      this._doSwitch(name, params);
      this._fadeIn();
    }
  }

  /**
   * 立即切换（无动画）
   */
  switchImmediate(name, params = {}) {
    this._doSwitch(name, params);
    this._fadeAlpha = 0;
    this._isFading = false;
  }

  _doSwitch(name, params) {
    if (this.currentScene && this.currentScene.onExit) {
      this.currentScene.onExit();
    }
    this.currentSceneName = name;
    this.currentScene = this.scenes[name];
    if (this.currentScene && this.currentScene.onEnter) {
      this.currentScene.onEnter(params);
    }
  }

  _fadeOut(callback) {
    this._fadeAlpha = 0;
    this._fadeDir = 1;
    this._isFading = true;
    this._fadeDone = callback;
  }

  _fadeIn() {
    this._fadeAlpha = 1;
    this._fadeDir = -1;
    this._isFading = true;
    this._fadeDone = () => { this._isFading = false; };
  }

  update(dt) {
    if (this._isFading) {
      this._fadeAlpha += this._fadeDir * this._fadeSpeed * dt;
      this._fadeAlpha = Math.max(0, Math.min(1, this._fadeAlpha));

      if (this._fadeDir === 1 && this._fadeAlpha >= 1) {
        const cb = this._fadeDone;
        this._fadeDone = null;
        if (cb) cb();
      } else if (this._fadeDir === -1 && this._fadeAlpha <= 0) {
        this._fadeAlpha = 0;
        this._isFading = false;
        const cb = this._fadeDone;
        this._fadeDone = null;
        if (cb) cb();
      }
    }

    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(dt);
    }
  }

  render() {
    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render(this.ctx);
    }

    // 淡入淡出覆盖层
    if (this._fadeAlpha > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = this._fadeAlpha;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }
}

window.SceneManager = SceneManager;
