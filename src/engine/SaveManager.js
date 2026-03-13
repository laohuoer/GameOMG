/**
 * SaveManager.js - localStorage 存读档管理
 * 支持3个存档槽位，自动存档，手动存档
 */
class SaveManager {
  constructor() {
    this.SAVE_VERSION = '1.0.0';
    this.SAVE_KEY_PREFIX = 'pokemon_save_';
    this.MAX_SLOTS = 3;
  }

  /**
   * 获取指定槽位存档
   * @param {number} slot 0-2
   */
  load(slot = 0) {
    try {
      const raw = localStorage.getItem(`${this.SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // 版本兼容检查
      if (!data.version) return null;
      return data;
    } catch (e) {
      console.error('[SaveManager] 读档失败:', e);
      return null;
    }
  }

  /**
   * 保存到指定槽位
   * @param {number} slot
   * @param {object} saveData
   */
  save(slot = 0, saveData) {
    try {
      const data = Object.assign({}, saveData, {
        version: this.SAVE_VERSION,
        timestamp: Date.now(),
      });
      localStorage.setItem(`${this.SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[SaveManager] 存档失败:', e);
      return false;
    }
  }

  /**
   * 删除存档
   */
  delete(slot = 0) {
    localStorage.removeItem(`${this.SAVE_KEY_PREFIX}${slot}`);
  }

  /**
   * 检查所有槽位状态
   * @returns {Array} [{slot, exists, timestamp, playerName}]
   */
  getSlotsInfo() {
    const info = [];
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      const data = this.load(i);
      info.push({
        slot: i,
        exists: !!data,
        timestamp: data ? data.timestamp : null,
        playerName: data ? (data.player ? data.player.name : '???') : null,
        steps: data ? (data.player ? data.player.steps : 0) : 0,
      });
    }
    return info;
  }

  /**
   * 自动存档（使用槽位0）
   */
  autoSave(saveData) {
    return this.save(0, { ...saveData, isAutoSave: true });
  }

  /**
   * 创建默认存档数据
   */
  createDefaultSave(playerName = '小智') {
    return {
      version: this.SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        name: playerName,
        position: { mapId: 'town', x: 7, y: 10 },
        steps: 0,
        money: 3000,
        badges: 0,
        playTime: 0,
      },
      team: [],
      box: [],
      bag: {
        pokeballs: { poke_ball: 5, great_ball: 0, ultra_ball: 0 },
        medicine: { potion: 3, super_potion: 0, antidote: 1 },
        stones: {},
        keyItems: {},
      },
      flags: {},
      pokedex: {},
    };
  }
}

window.SaveManager = SaveManager;
