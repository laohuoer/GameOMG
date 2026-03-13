/**
 * StatusEffect.js - 异常状态管理
 * 集中管理异常状态的应用、移除、回合结算
 */
class StatusEffect {
  static STATUS = {
    NONE: null,
    POISON: 'poison',
    BADLY_POISON: 'badly_poison',
    BURN: 'burn',
    PARALYSIS: 'paralysis',
    SLEEP: 'sleep',
    FREEZE: 'freeze',
  };

  static STATUS_NAMES = {
    poison: '中毒',
    badly_poison: '剧毒',
    burn: '烧伤',
    paralysis: '麻痹',
    sleep: '睡眠',
    freeze: '冰冻',
  };

  static STATUS_COLORS = {
    poison: '#a040a0',
    badly_poison: '#6600aa',
    burn: '#f08030',
    paralysis: '#f8d030',
    sleep: '#7038f8',
    freeze: '#98d8d8',
  };

  /**
   * 尝试对目标施加状态
   * @param {Pokemon} target
   * @param {string} status
   * @param {number} chance 概率 0-1
   * @returns {{ applied: boolean, message: string }}
   */
  static tryApply(target, status, chance = 1.0) {
    if (Math.random() > chance) {
      return { applied: false, message: null };
    }
    if (target.status) {
      return { applied: false, message: null };
    }

    // 属性免疫检查
    if (status === StatusEffect.STATUS.BURN && target.types.includes('fire')) {
      return { applied: false, message: `${target.displayName} 因为是火系，不会被烧伤！` };
    }
    if (status === StatusEffect.STATUS.POISON && (target.types.includes('poison') || target.types.includes('steel'))) {
      return { applied: false, message: `${target.displayName} 对中毒免疫！` };
    }
    if (status === StatusEffect.STATUS.PARALYSIS && target.types.includes('electric')) {
      return { applied: false, message: `${target.displayName} 因为是电系，不会麻痹！` };
    }
    if (status === StatusEffect.STATUS.FREEZE && target.types.includes('ice')) {
      return { applied: false, message: `${target.displayName} 因为是冰系，不会冰冻！` };
    }

    const applied = target.applyStatus(status);
    if (applied) {
      const name = StatusEffect.STATUS_NAMES[status] || status;
      return { applied: true, message: `${target.displayName} 陷入了${name}状态！` };
    }
    return { applied: false, message: null };
  }

  /**
   * 获取状态简称标签（用于 UI 显示）
   */
  static getLabel(status) {
    const labels = {
      poison: 'PSN', badly_poison: 'PSN',
      burn: 'BRN', paralysis: 'PAR',
      sleep: 'SLP', freeze: 'FRZ',
    };
    return labels[status] || '';
  }

  /**
   * 获取状态颜色
   */
  static getColor(status) {
    return StatusEffect.STATUS_COLORS[status] || '#888';
  }
}

window.StatusEffect = StatusEffect;
