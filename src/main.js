/**
 * main.js - 游戏入口，初始化所有系统并启动主循环
 */
(function () {
  'use strict';

  // ===================================
  // Canvas 响应式缩放
  // ===================================
  function setupResponsiveCanvas() {
    const container = document.getElementById('game-container');
    if (!container) return;

    function resize() {
      const scaleX = window.innerWidth / 480;
      const scaleY = window.innerHeight / 320;
      const scale = Math.min(scaleX, scaleY);
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = 'top left';
      const left = (window.innerWidth - 480 * scale) / 2;
      const top = (window.innerHeight - 320 * scale) / 2;
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.position = 'absolute';
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
  }

  // ===================================
  // 加载进度 UI
  // ===================================
  function setLoadingProgress(pct, msg) {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    if (bar) bar.style.width = `${Math.floor(pct * 100)}%`;
    if (text) text.textContent = msg || '加载中...';
  }

  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => { overlay.style.display = 'none'; }, 600);
    }
  }

  // ===================================
  // 主游戏类
  // ===================================
  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = 480;
      this.canvas.height = 320;

      // 核心引擎
      this.gameLoop = new GameLoop();
      this.assetLoader = new AssetLoader();
      this.inputManager = new InputManager();
      this.saveManager = new SaveManager();
      this.sceneManager = new SceneManager(this.canvas, this.ctx);

      // 宝可梦数据层
      this.apiClient = new PokeAPIClient();
      this.pokemonFactory = new PokemonFactory(this.apiClient);

      // 移动端控制器
      this.mobileControls = new MobileControls(this.inputManager);

      // 场景注册（后续在 _initScenes 中完成）
      this.scenes = {};
    }

    async init() {
      setLoadingProgress(0.05, '初始化引擎...');

      // 响应式缩放
      setupResponsiveCanvas();

      // 移动端检测
      if (MobileControls.isTouchDevice()) {
        this.mobileControls.enable();
      }

      setLoadingProgress(0.15, '加载资源...');

      // 加载资源（不强制依赖，失败则用占位）
      await this.assetLoader.loadAll([], (p, msg) => {
        setLoadingProgress(0.15 + p * 0.3, msg);
      });

      setLoadingProgress(0.5, '初始化场景...');
      this._initScenes();

      setLoadingProgress(0.8, '准备就绪...');

      // 禁用右键菜单（移动端）
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());

      // 启动
      await this._delay(300);
      setLoadingProgress(1.0, '开始游戏！');
      await this._delay(400);
      hideLoading();

      // 进入标题界面
      this.sceneManager.switchImmediate('title');

      // 启动主循环
      this.gameLoop.start(
        (dt) => this._update(dt),
        ()    => this._render()
      );
    }

    _initScenes() {
      // 标题场景
      const titleScene = new TitleScene(this.canvas, this.sceneManager, this.saveManager);
      this.sceneManager.register('title', {
        onEnter: (p) => titleScene.onEnter(p),
        onExit: ()  => titleScene.onExit(),
        update: (dt) => titleScene.update(dt, this.inputManager),
        render: (ctx) => titleScene.render(ctx),
      });

      // 世界场景
      const worldScene = new WorldScene(
        this.canvas, this.sceneManager, this.saveManager,
        this.assetLoader, this.pokemonFactory
      );
      this.sceneManager.register('world', {
        onEnter: (p) => {
          if (p && p.resumeWorld && p.player) {
            // 从战斗返回，恢复玩家状态
            worldScene.player = p.player;
            worldScene._loadMap(worldScene.currentMapId);
          } else {
            worldScene.onEnter(p);
          }
        },
        onExit: ()  => worldScene.onExit(),
        update: (dt) => worldScene.update(dt, this.inputManager),
        render: (ctx) => worldScene.render(ctx),
      });

      // 战斗场景
      const battleScene = new BattleScene(this.canvas, this.sceneManager);
      battleScene._evolutionFactory = this.pokemonFactory;
      this.sceneManager.register('battle', {
        onEnter: (p) => battleScene.onEnter(p),
        onExit: ()  => battleScene.onExit(),
        update: (dt) => battleScene.update(dt, this.inputManager),
        render: (ctx) => battleScene.render(ctx),
      });
    }

    _update(dt) {
      this.inputManager.update();
      this.sceneManager.update(dt);
    }

    _render() {
      // 清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.sceneManager.render();
    }

    _delay(ms) {
      return new Promise(r => setTimeout(r, ms));
    }
  }

  // ===================================
  // 全局错误处理
  // ===================================
  window.addEventListener('error', (e) => {
    console.error('[Game Error]', e.message, e.filename, e.lineno);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Unhandled Promise]', e.reason);
  });

  // ===================================
  // 启动游戏
  // ===================================
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      const game = new Game();
      window._gameInstance = game; // 调试用
      await game.init();
    } catch (e) {
      console.error('[Game Init Failed]', e);
      document.getElementById('loading-text').textContent = '加载失败，请刷新重试';
    }
  });

})();
