/**
 * WorldScene.js - 地图探索主场景
 * 管理玩家移动、Tilemap渲染、触发器、遭遇战斗
 */
class WorldScene {
  constructor(canvas, sceneManager, saveManager, assetLoader, pokemonFactory) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sceneManager = sceneManager;
    this.saveManager = saveManager;
    this.assetLoader = assetLoader;
    this.factory = pokemonFactory;
    this.W = canvas.width;
    this.H = canvas.height;

    // 地图系统
    this.tileSet = null;
    this.tileMap = new TileMap(null);
    this.triggerZone = new TriggerZone();

    // 玩家
    this.player = null;

    // HUD
    this.hud = new HUD(canvas);

    // 当前地图 ID
    this.currentMapId = 'town';

    // 地图数据
    this._mapCache = {};

    // 触发器回调
    this._setupTriggers();

    // 对话框
    this.dialogBox = new DialogBox(canvas);
    this._inDialog = false;

    // 自动存档间隔（秒）
    this._autoSaveTimer = 0;
    this._autoSaveInterval = 30;

    // 输入冷却
    this._keyTimer = 0;
    this._keyRepeat = 0.18;
  }

  _setupTriggers() {
    this.triggerZone.onWarp = (data) => {
      this._warpToMap(data.targetMap, data.targetX, data.targetY);
    };

    this.triggerZone.onEncounter = (data) => {
      this._startWildBattle(data);
    };

    this.triggerZone.onSign = (data) => {
      this._showDialog(data.message);
    };
  }

  onEnter(params = {}) {
    const saveData = params.saveData;
    if (saveData) {
      this._loadFromSave(saveData);
    }
    this._loadMap(this.currentMapId);
    this.hud.showToast(`来到了 ${this._getMapDisplayName(this.currentMapId)}`);
  }

  onExit() {
    this._autoSave();
  }

  _loadFromSave(saveData) {
    const pos = saveData.player?.position || { mapId: 'town', x: 7, y: 10 };
    this.currentMapId = pos.mapId || 'town';

    // 创建玩家
    this.player = new Player({
      name: saveData.player?.name || '小智',
      tileX: pos.x || 7,
      tileY: pos.y || 10,
      steps: saveData.player?.steps || 0,
      money: saveData.player?.money || 3000,
      bag: saveData.bag || undefined,
      mapId: this.currentMapId,
    });

    // 恢复队伍
    if (saveData.team && saveData.team.length > 0) {
      this.player.team = saveData.team.map(d => Pokemon.fromJSON(d));
    } else {
      // 新游戏：先立即给一只离线默认皮卡丘保证可玩性，再异步从API更新
      const defaultPika = this.factory.createDefault(25, 5, false);
      this.player.addPokemonToTeam(defaultPika);
      this._giveStarterPokemon(); // 异步，不阻塞流程
    }

    this.hud.playTime = saveData.player?.playTime || 0;
  }

  async _giveStarterPokemon() {
    try {
      const pikachu = await this.factory.createFromAPI(25, 5, false);
      if (this.player) {
        // 替换第一只（默认离线版）
        this.player.team[0] = pikachu;
      }
    } catch (e) {
      // 已有离线默认版本，不需要处理
    }
  }

  _loadMap(mapId) {
    if (this._mapCache[mapId]) {
      this.tileMap.load(this._mapCache[mapId]);
      this._initTileSet();
      return;
    }

    // 使用程序生成的内置地图数据
    const mapData = this._generateMapData(mapId);
    this._mapCache[mapId] = mapData;
    this.tileMap.load(mapData);
    this._initTileSet();
  }

  _initTileSet() {
    // 程序绘制 Tileset（使用 Canvas 生成彩色瓦片）
    if (!this.tileSet) {
      // 直接使用离屏 Canvas 作为图像源，无需等待 onload
      const tileCanvas = this._generateTilesetCanvas();
      // TileSet 可以直接接受 Canvas 元素（drawImage 支持 HTMLCanvasElement）
      this.tileSet = new TileSet(tileCanvas, 16, 16);
      this.tileMap.tileSet = this.tileSet;
      this.tileMap._buildGroundCache();
    } else {
      // tileSet 已存在，地图切换时只需重建缓存
      this.tileMap.tileSet = this.tileSet;
      this.tileMap._buildGroundCache();
    }
  }

  /**
   * 程序生成 Tileset Canvas（直接返回 CanvasElement，不转 Image，无异步问题）
   */
  _generateTilesetCanvas() {
    const tileW = 16, tileH = 16;
    const cols = 16, rows = 4;
    const canvas = document.createElement('canvas');
    canvas.width = cols * tileW;
    canvas.height = rows * tileH;
    const ctx = canvas.getContext('2d');

    const tileColors = [
      null,        // 0: 空
      '#7ac748',   // 1: 草地（淡绿）
      '#5a9e30',   // 2: 深草地
      '#e8d870',   // 3: 沙地
      '#8888ee',   // 4: 水
      '#666699',   // 5: 深水
      '#c87828',   // 6: 泥土路
      '#b87020',   // 7: 深路
      '#aaaaaa',   // 8: 石板路
      '#888888',   // 9: 深石板
      '#d0b080',   // 10: 建筑地基
      '#e0c090',   // 11: 建筑浅色
      '#cc6644',   // 12: 建筑深色
      '#228822',   // 13: 树木（深绿）
      '#114411',   // 14: 树木（暗绿）
      '#ffffff',   // 15: 白色/雪
      '#ffaa00',   // 16: 精灵球图案（路点）
      '#ff4444',   // 17: 建筑屋顶
      '#884488',   // 18: 草丛（遭遇区）
      '#44aa44',   // 19: 草丛浅
      '#2288ff',   // 20: 水（浅）
      '#1166cc',   // 21: 水（深）
      '#eecc88',   // 22: 沙路
      '#ccaa66',   // 23: 沙路深
      '#ffff88',   // 24: 花朵
      '#ee88ee',   // 25: 花朵（粉）
    ];

    for (let i = 1; i < tileColors.length; i++) {
      if (!tileColors[i]) continue;
      const col = (i - 1) % cols;
      const row = Math.floor((i - 1) / cols);
      const x = col * tileW;
      const y = row * tileH;

      ctx.fillStyle = tileColors[i];
      ctx.fillRect(x, y, tileW, tileH);

      this._addTileTexture(ctx, i, x, y, tileW, tileH, tileColors[i]);
    }

    return canvas;
  }

  _addTileTexture(ctx, id, x, y, w, h, baseColor) {
    ctx.save();
    // 草地纹理
    if (id === 1 || id === 19) {
      ctx.fillStyle = 'rgba(0,100,0,0.2)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 3 + i * 4, y + 10, 1, 4);
        ctx.fillRect(x + 5 + i * 4, y + 8, 1, 6);
      }
    }
    // 草丛深色点
    if (id === 18) {
      ctx.fillStyle = 'rgba(0,80,0,0.4)';
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillRect(x + 10, y + 6, 4, 4);
      ctx.fillRect(x + 6, y + 10, 3, 5);
    }
    // 水面波纹
    if (id === 4 || id === 20) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6);
      ctx.bezierCurveTo(x+5,y+4, x+11,y+8, x+14,y+6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 11);
      ctx.bezierCurveTo(x+5,y+9, x+11,y+13, x+14,y+11);
      ctx.stroke();
    }
    // 树木
    if (id === 13 || id === 14) {
      ctx.fillStyle = '#33aa33';
      ctx.beginPath();
      ctx.arc(x + w/2, y + h/2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#226622';
      ctx.beginPath();
      ctx.arc(x + w/2 - 2, y + h/2 - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * 程序生成地图数据
   */
  _generateMapData(mapId) {
    if (mapId === 'town') return this._generateTownMap();
    if (mapId === 'route1') return this._generateRoute1Map();
    return this._generateTownMap(); // 默认
  }

  _generateTownMap() {
    const W = 25, H = 20;
    const ground = new Array(W * H).fill(1);
    const decor = new Array(W * H).fill(0);
    const collision = new Array(W * H).fill(0);

    const set = (layer, x, y, v) => {
      if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = v;
    };
    const fill = (layer, x1, y1, x2, y2, v) => {
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          set(layer, x, y, v);
    };

    // 地面基础（路）
    fill(ground, 0, 0, W-1, H-1, 1);

    // 中央道路（竖向）
    fill(ground, 10, 0, 12, H-1, 8);

    // 横向道路
    fill(ground, 0, 10, W-1, 11, 8);

    // 建筑基础（左上区域）
    fill(ground, 1, 1, 7, 7, 10);

    // 建筑装饰
    fill(decor, 1, 1, 7, 2, 17); // 屋顶
    fill(decor, 2, 3, 6, 6, 11); // 建筑主体
    // 碰撞
    fill(collision, 1, 1, 7, 6, 1);

    // 右侧建筑
    fill(ground, 14, 1, 21, 6, 10);
    fill(decor, 14, 1, 21, 2, 17);
    fill(decor, 15, 3, 20, 5, 11);
    fill(collision, 14, 1, 21, 5, 1);

    // 水池（左下）
    fill(ground, 1, 13, 8, 18, 4);
    fill(decor, 2, 14, 7, 17, 20);
    fill(collision, 1, 13, 8, 18, 1);

    // 树木边界
    for (let x = 0; x < W; x++) {
      set(decor, x, 0, 13);
      set(collision, x, 0, 1);
    }
    for (let y = 1; y < H-1; y++) {
      set(decor, 0, y, 13);
      set(collision, 0, y, 1);
      set(decor, W-1, y, 13);
      set(collision, W-1, y, 1);
    }
    // 底部出口（通向1号道路）
    for (let x = 9; x <= 13; x++) {
      set(decor, x, H-1, 0);
      set(collision, x, H-1, 0);
    }

    // 草丛（右下）
    fill(ground, 14, 13, 22, 19, 18);

    // 花朵装饰
    set(decor, 5, 9, 24);
    set(decor, 15, 9, 25);

    const triggers = [
      // 草丛区域触发
      ...this._createGrassTriggers(14, 13, 22, 19, [16,19,21], 2, 6),
      // 传送点到1号道路（南出口）
      { x: 10, y: H-1, type:'warp', target:'route1', targetX:10, targetY:1 },
      { x: 11, y: H-1, type:'warp', target:'route1', targetX:11, targetY:1 },
      { x: 12, y: H-1, type:'warp', target:'route1', targetX:12, targetY:1 },
    ];

    return {
      id: 'town', width: W, height: H, tileWidth: 16, tileHeight: 16,
      layers: [
        { name: 'ground',    visible: true,  data: ground },
        { name: 'decor',     visible: true,  data: decor },
        { name: 'collision', visible: false, data: collision },
      ],
      triggers,
    };
  }

  _generateRoute1Map() {
    const W = 20, H = 40;
    const ground = new Array(W * H).fill(1);
    const decor = new Array(W * H).fill(0);
    const collision = new Array(W * H).fill(0);

    const set = (layer, x, y, v) => {
      if (x >= 0 && x < W && y >= 0 && y < H) layer[y * W + x] = v;
    };
    const fill = (layer, x1, y1, x2, y2, v) => {
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          set(layer, x, y, v);
    };

    // 道路主干
    fill(ground, 8, 0, 13, H-1, 8);

    // 草丛分布
    fill(ground, 0, 0, 7, H-1, 18);
    fill(ground, 14, 0, W-1, H-1, 18);

    // 左右边界树木
    for (let y = 0; y < H; y++) {
      set(decor, 0, y, 13);
      set(collision, 0, y, 1);
      set(decor, W-1, y, 13);
      set(collision, W-1, y, 1);
    }

    // 顶部（连接镇子，北出口）
    for (let x = 9; x <= 12; x++) {
      set(collision, x, 0, 0);
    }
    fill(collision, 1, 0, 7, 0, 1);
    fill(collision, 14, 0, W-2, 0, 1);

    // 一些树木（非碰撞障碍）
    const treePositions = [
      [3,5],[5,8],[2,12],[6,15],[4,20],[3,25],[7,30],
      [16,4],[15,9],[17,14],[16,20],[15,26],[18,32],
    ];
    for (const [x, y] of treePositions) {
      set(decor, x, y, 14);
      set(collision, x, y, 1);
    }

    // 路边标识
    set(decor, 9, 2, 24);

    const grassIds = [10, 13, 16, 19, 21];
    const triggers = [
      // 左侧草丛触发
      ...this._createGrassTriggers(1, 1, 7, H-2, grassIds, 3, 10, 0.15),
      // 右侧草丛触发
      ...this._createGrassTriggers(14, 1, W-2, H-2, grassIds, 3, 10, 0.15),
      // 北出口（回镇子）
      { x: 9,  y: 0, type:'warp', target:'town', targetX:9,  targetY:17 },
      { x: 10, y: 0, type:'warp', target:'town', targetX:10, targetY:17 },
      { x: 11, y: 0, type:'warp', target:'town', targetX:11, targetY:17 },
      { x: 12, y: 0, type:'warp', target:'town', targetX:12, targetY:17 },
    ];

    return {
      id: 'route1', width: W, height: H, tileWidth: 16, tileHeight: 16,
      layers: [
        { name: 'ground',    visible: true,  data: ground },
        { name: 'decor',     visible: true,  data: decor },
        { name: 'collision', visible: false, data: collision },
      ],
      triggers,
    };
  }

  _createGrassTriggers(x1, y1, x2, y2, pokemonIds, minLv, maxLv, rate = 0.12) {
    const triggers = [];
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        triggers.push({
          x, y, type: 'grass',
          encounterRate: rate,
          pokemonIds,
          minLevel: minLv,
          maxLevel: maxLv,
        });
      }
    }
    return triggers;
  }

  update(dt, input) {
    this.hud.update(dt);
    this.dialogBox.update(dt);

    // 自动存档
    this._autoSaveTimer += dt;
    if (this._autoSaveTimer >= this._autoSaveInterval) {
      this._autoSaveTimer = 0;
      this._autoSave();
    }

    if (this._inDialog) {
      if (input.isActionJustPressed('a') || input.isActionJustPressed('b')) {
        if (this.dialogBox.isComplete) {
          this._inDialog = false;
          this.dialogBox.hide();
        } else {
          this.dialogBox.skipAnimation();
        }
      }
      return;
    }

    if (!this.player) return;

    // 更新玩家（移动逻辑）
    this.player.update(dt, input, this.tileMap, (tileX, tileY) => {
      // 踩到新瓦片时检查触发器
      this.triggerZone.checkTile(this.tileMap, tileX, tileY);
    });

    // 摄像机跟随
    this.tileMap.updateCamera(
      this.player.pixelX + this.player.tileWidth / 2,
      this.player.pixelY + this.player.tileHeight / 2,
      this.W, this.H
    );
  }

  render(ctx) {
    // 背景颜色
    ctx.fillStyle = '#7ac748';
    ctx.fillRect(0, 0, this.W, this.H);

    // 渲染地图（地面层）
    this.tileMap.render(ctx);

    // 渲染玩家
    if (this.player) {
      this.player.render(ctx, this.tileMap);
    }

    // 渲染地图上层（树顶等）
    this.tileMap.renderOverlay(ctx);

    // HUD
    this.hud.render(ctx, this.player);

    // 对话框
    if (this._inDialog) {
      this.dialogBox.render(ctx);
    }
  }

  _showDialog(text) {
    this._inDialog = true;
    this.dialogBox.show(text);
  }

  _warpToMap(targetMap, targetX, targetY) {
    if (this.player) {
      this.player.tileX = targetX;
      this.player.tileY = targetY;
      this.player.pixelX = targetX * 16;
      this.player.pixelY = targetY * 16;
      this.player.targetPixelX = this.player.pixelX;
      this.player.targetPixelY = this.player.pixelY;
      this.player.mapId = targetMap;
    }
    this.currentMapId = targetMap;
    this._loadMap(targetMap);
    this.triggerZone.reset();
    this.hud.showToast(`来到了 ${this._getMapDisplayName(targetMap)}`);
    this._autoSave();
  }

  async _startWildBattle(data) {
    if (!this.player) return;
    const activePokemon = this.player.getFirstAlivePokemon();
    if (!activePokemon) return;

    try {
      const wildPokemon = await this.factory.createFromAPI(data.pokemonId, data.level, true);
      this.sceneManager.switchTo('battle', {
        playerPokemon: activePokemon,
        enemyPokemon: wildPokemon,
        player: this.player,
        isWild: true,
        onEnd: (result) => {
          this.sceneManager.switchTo('world', { resumeWorld: true, player: this.player });
        }
      });
    } catch (e) {
      console.error('[WorldScene] 创建野生宝可梦失败:', e);
    }
  }

  _autoSave() {
    if (!this.player) return;
    const saveData = {
      player: {
        name: this.player.name,
        position: { mapId: this.currentMapId, x: this.player.tileX, y: this.player.tileY },
        steps: this.player.steps,
        money: this.player.money,
        playTime: Math.floor(this.hud.playTime),
      },
      team: this.player.team.map(p => p.toJSON()),
      box: [],
      bag: this.player.bag,
      flags: {},
    };
    this.saveManager.autoSave(saveData);
  }

  _getMapDisplayName(mapId) {
    const names = { town: '真新镇', route1: '1号道路' };
    return names[mapId] || mapId;
  }
}

window.WorldScene = WorldScene;
