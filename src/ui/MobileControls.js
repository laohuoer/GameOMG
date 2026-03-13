/**
 * MobileControls.js - 移动端虚拟摇杆 + A/B/START 按钮
 */
class MobileControls {
  constructor(inputManager) {
    this.input = inputManager;
    this.enabled = false;

    // DOM 元素
    this.container = document.getElementById('mobile-controls');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickThumb = document.getElementById('joystick-thumb');
    this.btnA = document.getElementById('btn-a');
    this.btnB = document.getElementById('btn-b');
    this.btnStart = document.getElementById('btn-start');

    if (!this.container) {
      console.warn('[MobileControls] 找不到移动端控制器 DOM 元素');
      return;
    }

    // 摇杆状态
    this._joystickTouchId = null;
    this._joystickCenter = { x: 0, y: 0 };
    this._joystickRadius = 35;

    this._bindEvents();
  }

  /**
   * 检测是否为移动端/触屏设备
   */
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  enable() {
    if (!this.container) return;
    this.enabled = true;
    this.container.classList.remove('hidden');
  }

  disable() {
    if (!this.container) return;
    this.enabled = false;
    this.container.classList.add('hidden');
  }

  _bindEvents() {
    if (!this.joystickBase) return;

    // 摇杆触摸事件
    this.joystickBase.addEventListener('touchstart', this._onJoystickStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this._onJoystickMove.bind(this), { passive: false });
    window.addEventListener('touchend', this._onJoystickEnd.bind(this), { passive: false });
    window.addEventListener('touchcancel', this._onJoystickEnd.bind(this), { passive: false });

    // 按钮事件
    this._bindButton(this.btnA, 'a');
    this._bindButton(this.btnB, 'b');
    this._bindButton(this.btnStart, 'start');
  }

  _bindButton(el, action) {
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.setMobileAction(action, true);
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.input.setMobileAction(action, false);
    }, { passive: false });
    el.addEventListener('touchcancel', (e) => {
      this.input.setMobileAction(action, false);
    }, { passive: false });
  }

  _onJoystickStart(e) {
    e.preventDefault();
    if (this._joystickTouchId !== null) return;
    const touch = e.changedTouches[0];
    this._joystickTouchId = touch.identifier;

    const rect = this.joystickBase.getBoundingClientRect();
    this._joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    this._updateJoystick(touch);
  }

  _onJoystickMove(e) {
    e.preventDefault();
    if (this._joystickTouchId === null) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._joystickTouchId) {
        this._updateJoystick(touch);
        break;
      }
    }
  }

  _onJoystickEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._joystickTouchId) {
        this._joystickTouchId = null;
        this.input.setJoystick(false, 0, 0);
        this._resetThumb();
        break;
      }
    }
  }

  _updateJoystick(touch) {
    const dx = touch.clientX - this._joystickCenter.x;
    const dy = touch.clientY - this._joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this._joystickRadius);
    const angle = Math.atan2(dy, dx);

    const ndx = Math.cos(angle) * (clampedDist / this._joystickRadius);
    const ndy = Math.sin(angle) * (clampedDist / this._joystickRadius);

    // 更新拇指位置
    if (this.joystickThumb) {
      const tx = Math.cos(angle) * Math.min(dist, this._joystickRadius);
      const ty = Math.sin(angle) * Math.min(dist, this._joystickRadius);
      this.joystickThumb.style.transform = `translate(${tx}px, ${ty}px)`;
    }

    this.input.setJoystick(true, ndx, ndy);
  }

  _resetThumb() {
    if (this.joystickThumb) {
      this.joystickThumb.style.transform = 'translate(0px, 0px)';
    }
  }
}

window.MobileControls = MobileControls;
