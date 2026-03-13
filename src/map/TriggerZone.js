/**
 * TriggerZone.js - 区域触发器管理
 * 处理草丛遭遇、传送点等区域事件
 */
class TriggerZone {
  constructor() {
    this.onWarp = null;     // (warpData) => void
    this.onEncounter = null; // (encounterData) => void
    this._lastTriggerTile = null;
    this._stepsSinceLastEncounter = 0;
  }

  /**
   * 玩家移动到新瓦片时调用
   * @param {TileMap} tileMap
   * @param {number} tileX
   * @param {number} tileY
   */
  checkTile(tileMap, tileX, tileY) {
    const trigger = tileMap.getTrigger(tileX, tileY);
    if (!trigger) {
      this._lastTriggerTile = null;
      return;
    }

    // 防止同一瓦片重复触发
    const key = `${tileX},${tileY}`;
    if (this._lastTriggerTile === key && trigger.type !== 'grass') return;
    this._lastTriggerTile = key;

    switch (trigger.type) {
      case 'warp':
        this._handleWarp(trigger);
        break;
      case 'grass':
        this._handleGrass(trigger);
        break;
      case 'sign':
        this._handleSign(trigger);
        break;
    }
  }

  _handleWarp(trigger) {
    if (this.onWarp) {
      this.onWarp({
        targetMap: trigger.target,
        targetX: trigger.targetX || 0,
        targetY: trigger.targetY || 0,
      });
    }
  }

  _handleGrass(trigger) {
    this._stepsSinceLastEncounter++;
    const rate = trigger.encounterRate || 0.1;

    // 增加步数后概率递增，减少每步都触发的烦躁感
    const adjustedRate = rate * (1 + this._stepsSinceLastEncounter * 0.02);
    const clampedRate = Math.min(adjustedRate, 0.4);

    if (Math.random() < clampedRate) {
      this._stepsSinceLastEncounter = 0;
      if (this.onEncounter) {
        // 随机选取遭遇的宝可梦 ID（第一世代）
        const possibleIds = trigger.pokemonIds || this._getDefaultPokemonIds();
        const pokemonId = possibleIds[Math.floor(Math.random() * possibleIds.length)];
        const level = this._randomLevel(trigger.minLevel || 2, trigger.maxLevel || 8);
        this.onEncounter({ pokemonId, level, isWild: true });
      }
    }
  }

  _handleSign(trigger) {
    // 告示牌消息，留给 WorldScene 处理
    if (this.onSign) {
      this.onSign({ message: trigger.message || '（空白告示牌）' });
    }
  }

  _randomLevel(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _getDefaultPokemonIds() {
    // 真新镇附近常见宝可梦
    return [16, 19, 21, 10, 13]; // 波波、小拉达、烈雀、绿毛虫、独角虫
  }

  reset() {
    this._lastTriggerTile = null;
    this._stepsSinceLastEncounter = 0;
  }
}

window.TriggerZone = TriggerZone;
