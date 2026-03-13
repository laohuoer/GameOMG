/**
 * CatchSystem.js - 精灵球捕捉概率计算
 */
class CatchSystem {
  constructor() {
    // 精灵球加成倍率
    this.ballBonus = {
      poke_ball: 1,
      great_ball: 1.5,
      ultra_ball: 2,
      master_ball: 255, // 必中
    };
  }

  /**
   * 计算捕捉概率
   * 公式: (3×maxHP - 2×currentHP) × catchRate × ballBonus / (3×maxHP)
   *
   * @param {Pokemon} pokemon 目标宝可梦
   * @param {string} ballType 精灵球类型
   * @returns {{ success: boolean, shakes: number, rate: number }}
   */
  attempt(pokemon, ballType = 'poke_ball') {
    const maxHP = pokemon.stats.hp;
    const currentHP = pokemon.currentHP;
    const catchRate = pokemon.catchRate || 45;
    const bonus = this.ballBonus[ballType] || 1;

    // 万能球直接成功
    if (ballType === 'master_ball') {
      return { success: true, shakes: 3, rate: 1 };
    }

    // 状态加成
    let statusBonus = 1;
    if (pokemon.status === 'sleep' || pokemon.status === 'freeze') {
      statusBonus = 2;
    } else if (pokemon.status) {
      statusBonus = 1.5;
    }

    // 捕捉值 a（越大越容易捕捉）
    const a = Math.floor((3 * maxHP - 2 * currentHP) * catchRate * bonus * statusBonus / (3 * maxHP));
    const clampedA = Math.max(1, Math.min(255, a));

    // 捕捉概率 p（0-1）
    const rate = clampedA / 255;

    // 摇晃次数计算（模拟4次检定）
    // 每次检定阈值 b = 65536 / (255/a)^0.1875
    const b = Math.floor(65536 / Math.pow(255 / clampedA, 0.1875));

    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.floor(Math.random() * 65536) < b) {
        shakes++;
      } else {
        break;
      }
    }

    const success = Math.random() < rate;

    return {
      success,
      shakes: success ? 3 : shakes,
      rate,
    };
  }

  /**
   * 获取精灵球显示名称
   */
  static getBallName(ballType) {
    const names = {
      poke_ball: '精灵球',
      great_ball: '超级球',
      ultra_ball: '高级球',
      master_ball: '大师球',
    };
    return names[ballType] || '精灵球';
  }
}

window.CatchSystem = CatchSystem;
