/**
 * InputManager.js - 键盘+触屏输入统一管理
 * 对外暴露标准化的输入状态，屏蔽平台差异
 */
class InputManager {
  constructor() {
    // 按键状态
    this._keys = {};
    this._prevKeys = {};

    // 方向状态（标准化）
    this.direction = { x: 0, y: 0 };
    this.prevDirection = { x: 0, y: 0 };

    // 动作按钮状态
    this._actions = {
      a: false,
      b: false,
      start: false,
    };
    this._prevActions = { a: false, b: false, start: false };

    // 触摸/虚拟摇杆
    this._joystick = { active: false, dx: 0, dy: 0 };
    this._joystickDeadzone = 0.3;

    this._bindKeyboard();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this._keys[e.code] = true;
      // 防止方向键滚动页面
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false;
    });
  }

  /**
   * 每帧调用，更新状态快照
   */
  update() {
    // 保存上一帧状态
    this._prevKeys = Object.assign({}, this._keys);
    Object.assign(this._prevActions, this._actions);
    this.prevDirection = { ...this.direction };

    // 计算方向
    let dx = 0, dy = 0;

    // 键盘方向
    if (this._keys['ArrowLeft']  || this._keys['KeyA']) dx -= 1;
    if (this._keys['ArrowRight'] || this._keys['KeyD']) dx += 1;
    if (this._keys['ArrowUp']    || this._keys['KeyW']) dy -= 1;
    if (this._keys['ArrowDown']  || this._keys['KeyS']) dy += 1;

    // 虚拟摇杆方向（覆盖键盘）
    if (this._joystick.active) {
      const jdx = this._joystick.dx;
      const jdy = this._joystick.dy;
      if (Math.abs(jdx) > this._joystickDeadzone || Math.abs(jdy) > this._joystickDeadzone) {
        dx = jdx;
        dy = jdy;
      }
    }

    // 归一化到 -1/0/1
    this.direction.x = dx > 0.3 ? 1 : dx < -0.3 ? -1 : 0;
    this.direction.y = dy > 0.3 ? 1 : dy < -0.3 ? -1 : 0;

    // 动作键
    this._actions.a = this._keys['KeyZ'] || this._keys['Enter'] || false;
    this._actions.b = this._keys['KeyX'] || this._keys['Escape'] || false;
    this._actions.start = this._keys['Enter'] || false;
  }

  /**
   * 是否持续按下某方向
   */
  getDirection() {
    return this.direction;
  }

  /**
   * 某方向是否刚刚按下（仅首帧）
   */
  isDirectionJustPressed() {
    const cur = this.direction;
    const prev = this.prevDirection;
    return (cur.x !== 0 || cur.y !== 0) && (prev.x === 0 && prev.y === 0);
  }

  /**
   * A键是否按下
   */
  isActionPressed(action = 'a') {
    return this._actions[action] || false;
  }

  /**
   * A键是否刚刚按下（仅首帧）
   */
  isActionJustPressed(action = 'a') {
    return this._actions[action] && !this._prevActions[action];
  }

  /**
   * 任意键是否刚刚按下
   */
  isAnyKeyJustPressed() {
    return this.isActionJustPressed('a') || this.isActionJustPressed('b') || this.isActionJustPressed('start');
  }

  /**
   * 供 MobileControls 调用，设置虚拟摇杆状态
   */
  setJoystick(active, dx, dy) {
    this._joystick.active = active;
    this._joystick.dx = dx;
    this._joystick.dy = dy;
  }

  /**
   * 供 MobileControls 调用，设置虚拟按钮状态
   */
  setMobileAction(action, pressed) {
    this._actions[action] = pressed;
  }
}

window.InputManager = InputManager;
