/**
 * EvolutionSystem.js - 进化条件检测与触发
 */
class EvolutionSystem {
  constructor() {
    // 内置第一世代等级进化表（pokemonId → [{minLevel, evolvesTo}]）
    this.levelEvolutions = {
      // 御三家
      4:  [{ minLevel:16, evolvesTo:5 }],
      5:  [{ minLevel:36, evolvesTo:6 }],
      7:  [{ minLevel:16, evolvesTo:8 }],
      8:  [{ minLevel:36, evolvesTo:9 }],
      1:  [{ minLevel:16, evolvesTo:2 }],
      2:  [{ minLevel:32, evolvesTo:3 }],
      // 虫系
      10: [{ minLevel:7,  evolvesTo:11 }],
      11: [{ minLevel:10, evolvesTo:12 }],
      13: [{ minLevel:7,  evolvesTo:14 }],
      14: [{ minLevel:10, evolvesTo:15 }],
      // 飞行
      16: [{ minLevel:18, evolvesTo:17 }],
      17: [{ minLevel:36, evolvesTo:18 }],
      21: [{ minLevel:20, evolvesTo:22 }],
      // 毒
      23: [{ minLevel:22, evolvesTo:24 }],
      // 皮卡丘系
      // 皮卡丘→雷丘是属性石进化，不是等级进化
      // 小拉达
      19: [{ minLevel:20, evolvesTo:20 }],
      // 超能
      63: [{ minLevel:16, evolvesTo:64 }],
      64: [{ minLevel:36, evolvesTo:65 }],
      // 格斗
      66: [{ minLevel:28, evolvesTo:67 }],
      67: [{ minLevel:40, evolvesTo:68 }],
      // 腹立虫系
      46: [{ minLevel:24, evolvesTo:47 }],
      // 地鼠
      50: [{ minLevel:26, evolvesTo:51 }],
      // 喵喵
      52: [{ minLevel:28, evolvesTo:53 }],
      // 可达鸭
      54: [{ minLevel:33, evolvesTo:55 }],
      // 猴
      56: [{ minLevel:28, evolvesTo:57 }],
      // 风速狗
      58: [{ minLevel:36, evolvesTo:59 }],
      // 蚊香
      60: [{ minLevel:25, evolvesTo:61 }],
      61: [{ minLevel:36, evolvesTo:62 }],
      // 小海马
      116: [{ minLevel:32, evolvesTo:117 }],
      // 金鱼
      118: [{ minLevel:33, evolvesTo:119 }],
      // 海星
      120: [{ minLevel:30, evolvesTo:121 }],
      // 独角犀
      111: [{ minLevel:42, evolvesTo:112 }],
      // 蔓藤
      // 鲤鱼王
      129: [{ minLevel:20, evolvesTo:130 }],
      // 呆呆兽
      79: [{ minLevel:37, evolvesTo:80 }],
      // 小磁怪
      81: [{ minLevel:30, evolvesTo:82 }],
      // 嘟嘟
      84: [{ minLevel:31, evolvesTo:85 }],
      // 小海狮
      86: [{ minLevel:34, evolvesTo:87 }],
      // 大钳蟹
      // 催眠貘
      96: [{ minLevel:26, evolvesTo:97 }],
      // 鬼斯
      92: [{ minLevel:25, evolvesTo:93 }],
      93: [{ minLevel:36, evolvesTo:94 }],
      // 迷你龙
      147: [{ minLevel:30, evolvesTo:148 }],
      148: [{ minLevel:55, evolvesTo:149 }],
    };

    // 属性石进化表
    this.stoneEvolutions = {
      25: [{ stone:'thunder_stone', evolvesTo:26 }],
      37: [{ stone:'fire_stone',    evolvesTo:38 }],
      39: [{ stone:'moon_stone',    evolvesTo:40 }],
      43: [{ stone:'leaf_stone',    evolvesTo:44 }],
      44: [{ stone:'leaf_stone',    evolvesTo:45 }],
      133: [
        { stone:'water_stone',   evolvesTo:134 },
        { stone:'thunder_stone', evolvesTo:135 },
        { stone:'fire_stone',    evolvesTo:136 },
      ],
    };
  }

  /**
   * 检测等级进化条件
   * @param {Pokemon} pokemon
   * @returns {number|null} 进化后的宝可梦 ID，或 null
   */
  checkLevelEvolution(pokemon) {
    const evos = this.levelEvolutions[pokemon.id];
    if (!evos) return null;
    for (const evo of evos) {
      if (pokemon.level >= evo.minLevel) {
        return evo.evolvesTo;
      }
    }
    return null;
  }

  /**
   * 检测道具进化条件
   * @param {Pokemon} pokemon
   * @param {string} stone 使用的进化石 ID
   * @returns {number|null}
   */
  checkStoneEvolution(pokemon, stone) {
    const evos = this.stoneEvolutions[pokemon.id];
    if (!evos) return null;
    const evo = evos.find(e => e.stone === stone);
    return evo ? evo.evolvesTo : null;
  }

  /**
   * 执行进化（异步：更新 pokemon 数据）
   * @param {Pokemon} pokemon
   * @param {number} nextId
   * @param {PokemonFactory} factory
   */
  async evolve(pokemon, nextId, factory) {
    try {
      const evoData = await factory.createFromAPI(nextId, pokemon.level, pokemon.isWild);

      const oldName = pokemon.displayName;

      // 保留当前 HP 比例
      const hpRatio = pokemon.currentHP / pokemon.stats.hp;

      // 更新核心属性
      pokemon.id = evoData.id;
      pokemon.name = evoData.name;
      pokemon.displayName = evoData.displayName;
      pokemon.types = evoData.types;
      pokemon.baseStats = evoData.baseStats;
      pokemon.catchRate = evoData.catchRate;
      pokemon.spriteUrl = evoData.spriteUrl;
      pokemon.spriteBackUrl = evoData.spriteBackUrl;
      pokemon.evolutionData = evoData.evolutionData;

      // 重新计算属性
      pokemon.stats = pokemon._calcStats();
      pokemon.currentHP = Math.max(1, Math.floor(pokemon.stats.hp * hpRatio));

      // 更新精灵图
      if (evoData.spriteUrl) pokemon._loadSprite(evoData.spriteUrl, false);
      if (evoData.spriteBackUrl) pokemon._loadSprite(evoData.spriteBackUrl, true);

      return { oldName, newName: pokemon.displayName };
    } catch (e) {
      console.error('[EvolutionSystem] 进化失败:', e);
      return null;
    }
  }
}

window.EvolutionSystem = EvolutionSystem;
