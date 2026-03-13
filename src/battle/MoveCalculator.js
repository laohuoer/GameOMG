/**
 * MoveCalculator.js - 技能伤害/命中/效果计算
 */
class MoveCalculator {
  constructor(typeChart) {
    this.typeChart = typeChart;
  }

  /**
   * 计算技能伤害
   * 公式: ((2×等级/5+2) × 威力 × 攻击/防御 / 50 + 2) × 属性克制 × STAB × 随机(0.85~1.0)
   *
   * @param {Pokemon} attacker
   * @param {Pokemon} defender
   * @param {object} move  { power, type, category }
   * @returns {{ damage, multiplier, isCrit, effectiveness }}
   */
  calcDamage(attacker, defender, move) {
    if (!move.power || move.power === 0) {
      return { damage: 0, multiplier: 1, isCrit: false, effectiveness: 1 };
    }

    const lv = attacker.level;
    const power = move.power;

    // 攻击与防御（物理/特殊）
    const isPhysical = move.category === 'physical';
    const atk = isPhysical
      ? attacker.getEffectiveStat('attack')
      : attacker.getEffectiveStat('specialAttack');
    const def = isPhysical
      ? defender.getEffectiveStat('defense')
      : defender.getEffectiveStat('specialDefense');

    // 属性克制
    const effectiveness = this.typeChart.getTotalMultiplier(move.type, defender.types);
    if (effectiveness === 0) return { damage: 0, multiplier: 0, isCrit: false, effectiveness: 0 };

    // STAB（本系加成）
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;

    // 暴击
    const critChance = move.critRatio || 1; // 1=正常 6.25%, 2=高暴击率 12.5%
    const isCrit = Math.random() < (critChance === 1 ? 0.0625 : 0.125);
    const critMultiplier = isCrit ? 1.5 : 1.0;

    // 随机因子
    const random = 0.85 + Math.random() * 0.15;

    // 核心伤害公式
    const baseDmg = Math.floor((2 * lv / 5 + 2) * power * atk / def / 50) + 2;
    let damage = Math.floor(baseDmg * effectiveness * stab * critMultiplier * random);

    damage = Math.max(1, damage);

    return { damage, multiplier: effectiveness, isCrit, effectiveness };
  }

  /**
   * 命中检查
   * @param {Pokemon} attacker
   * @param {Pokemon} defender
   * @param {object} move { accuracy } 0-100，null = 必中
   * @returns {boolean}
   */
  checkAccuracy(attacker, defender, move) {
    if (move.accuracy === null || move.accuracy === undefined) return true;

    const accStage = attacker.statStages.accuracy || 0;
    const evaStage = defender.statStages.evasion || 0;
    const stageMultipliers = [0.33, 0.36, 0.43, 0.5, 0.6, 0.75, 1.0, 1.33, 1.66, 2.0, 2.33, 2.66, 3.0];
    const accMult = stageMultipliers[accStage + 6];
    const evaMult = stageMultipliers[evaStage + 6];

    const hitChance = (move.accuracy / 100) * accMult / evaMult;
    return Math.random() < hitChance;
  }

  /**
   * 处理技能副效果（状态、能力变化等）
   * @returns {string[]} 消息列表
   */
  applyMoveEffect(attacker, defender, move) {
    const messages = [];
    if (!move.effect) return messages;

    const effect = move.effect;

    // 异常状态
    if (effect.status) {
      const result = StatusEffect.tryApply(defender, effect.status, effect.statusChance || 1.0);
      if (result.message) messages.push(result.message);
    }

    // 自身状态
    if (effect.selfStatus) {
      const result = StatusEffect.tryApply(attacker, effect.selfStatus, 1.0);
      if (result.message) messages.push(result.message);
    }

    // 能力变化（目标）
    if (effect.statChanges) {
      for (const [stat, stages] of Object.entries(effect.statChanges)) {
        this._applyStatChange(defender, stat, stages, messages);
      }
    }

    // 能力变化（自身）
    if (effect.selfStatChanges) {
      for (const [stat, stages] of Object.entries(effect.selfStatChanges)) {
        this._applyStatChange(attacker, stat, stages, messages);
      }
    }

    // 回复
    if (effect.heal) {
      const healAmount = Math.floor(attacker.stats.hp * effect.heal);
      attacker.heal(healAmount);
      messages.push(`${attacker.displayName} 恢复了 ${healAmount} HP！`);
    }

    return messages;
  }

  _applyStatChange(pokemon, stat, stages, messages) {
    const oldStage = pokemon.statStages[stat] || 0;
    const newStage = Math.max(-6, Math.min(6, oldStage + stages));
    pokemon.statStages[stat] = newStage;

    const statNames = {
      attack: '攻击', defense: '防御',
      specialAttack: '特攻', specialDefense: '特防',
      speed: '速度', accuracy: '命中', evasion: '回避',
    };
    const statName = statNames[stat] || stat;
    const diff = newStage - oldStage;

    if (diff > 0) {
      messages.push(`${pokemon.displayName} 的${statName}${diff >= 2 ? '大幅' : ''}上升了！`);
    } else if (diff < 0) {
      messages.push(`${pokemon.displayName} 的${statName}${diff <= -2 ? '大幅' : ''}下降了！`);
    } else {
      messages.push(`${pokemon.displayName} 的${statName}已经无法再变化了！`);
    }
  }
}

window.MoveCalculator = MoveCalculator;
