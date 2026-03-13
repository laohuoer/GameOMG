/**
 * TypeChart.js - 18种属性克制关系
 * 数据静态内置，无需额外文件
 */
class TypeChart {
  constructor() {
    // 进攻属性 → 防御属性 → 倍率
    // 2 = 效果拔群, 0.5 = 效果不佳, 0 = 无效, 1 = 正常（省略）
    this._chart = {
      normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
      fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
      water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
      grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
      electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
      ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
      fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
      poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
      ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
      flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
      psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
      bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
      rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
      ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
      dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
      fairy:    { fighting: 2, poison: 0.5, bug: 0.5, dragon: 2, dark: 2, steel: 0.5 },
    };
  }

  /**
   * 获取单一属性克制倍率
   * @param {string} attackType 进攻属性
   * @param {string} defenseType 防御属性
   * @returns {number}
   */
  getMultiplier(attackType, defenseType) {
    const row = this._chart[attackType];
    if (!row) return 1;
    const val = row[defenseType];
    return val !== undefined ? val : 1;
  }

  /**
   * 对多属性目标的总克制倍率（如双属性）
   * @param {string} attackType
   * @param {string[]} defenseTypes
   * @returns {number}
   */
  getTotalMultiplier(attackType, defenseTypes) {
    let total = 1;
    for (const dt of defenseTypes) {
      total *= this.getMultiplier(attackType, dt);
    }
    return total;
  }

  /**
   * 获取效果描述文字
   */
  getEffectivenessText(multiplier) {
    if (multiplier === 0) return '没有效果...';
    if (multiplier < 1) return '效果不佳...';
    if (multiplier > 1) return '效果拔群！';
    return null;
  }
}

window.TypeChart = TypeChart;
