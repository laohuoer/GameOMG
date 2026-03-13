/**
 * Pokemon.js - 宝可梦战斗实体
 * 包含属性、技能、HP、异常状态等所有战斗相关数据
 */
class Pokemon {
  constructor(data) {
    // 基础信息
    this.id = data.id || 0;
    this.name = data.name || '未知';
    this.displayName = data.displayName || data.name || '未知';
    this.types = data.types || ['normal'];

    // 基础值（来自 API）
    this.baseStats = data.baseStats || {
      hp: 45, attack: 49, defense: 49,
      specialAttack: 65, specialDefense: 65, speed: 45,
    };

    // 等级与经验
    this.level = data.level || 5;
    this.experience = data.experience || 0;
    this.experienceToNext = this._calcExpToNext(this.level);

    // 实际属性（由等级和基础值计算）
    this.stats = this._calcStats();

    // 当前 HP
    this.currentHP = data.currentHP !== undefined ? data.currentHP : this.stats.hp;

    // 技能列表（最多4个）
    this.moves = data.moves || [];

    // 异常状态
    this.status = data.status || null; // 'poison'|'burn'|'paralysis'|'sleep'|'freeze'|'badly_poison'|null
    this.statusTurns = data.statusTurns || 0;
    this.badlyPoisonCounter = data.badlyPoisonCounter || 0;

    // 战斗中临时能力变化（-6 ~ +6）
    this.statStages = {
      attack: 0, defense: 0,
      specialAttack: 0, specialDefense: 0,
      speed: 0, accuracy: 0, evasion: 0,
    };

    // 精灵图 URL（前视/后视）
    this.spriteUrl = data.spriteUrl || null;
    this.spriteBackUrl = data.spriteBackUrl || null;
    this._spriteImg = null;
    this._spriteBackImg = null;

    // 捕捉率
    this.catchRate = data.catchRate || 45;

    // 进化数据
    this.evolutionData = data.evolutionData || null;

    // 是否为野生（影响经验分配）
    this.isWild = data.isWild || false;

    // 个体值 (IVs) 0-31
    this.ivs = data.ivs || this._generateIVs();

    // 加载精灵图
    if (this.spriteUrl) this._loadSprite(this.spriteUrl, false);
    if (this.spriteBackUrl) this._loadSprite(this.spriteBackUrl, true);
  }

  // ===== 属性计算 =====

  _calcStats() {
    const lv = this.level;
    const base = this.baseStats;
    const ivs = this.ivs || { hp: 15, attack: 15, defense: 15, specialAttack: 15, specialDefense: 15, speed: 15 };

    return {
      hp: Math.floor((2 * base.hp + ivs.hp) * lv / 100) + lv + 10,
      attack: Math.floor((2 * base.attack + ivs.attack) * lv / 100) + 5,
      defense: Math.floor((2 * base.defense + ivs.defense) * lv / 100) + 5,
      specialAttack: Math.floor((2 * base.specialAttack + ivs.specialAttack) * lv / 100) + 5,
      specialDefense: Math.floor((2 * base.specialDefense + ivs.specialDefense) * lv / 100) + 5,
      speed: Math.floor((2 * base.speed + ivs.speed) * lv / 100) + 5,
    };
  }

  _generateIVs() {
    return {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      specialAttack: Math.floor(Math.random() * 32),
      specialDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32),
    };
  }

  /**
   * 获取考虑能力等级变化后的实际属性
   */
  getEffectiveStat(statName) {
    const base = this.stats[statName] || 0;
    const stage = this.statStages[statName] || 0;
    const multipliers = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
    const mult = multipliers[stage + 6]; // stage -6~6 → index 0~12

    let effective = Math.floor(base * mult);

    // 麻痹降速
    if (statName === 'speed' && this.status === 'paralysis') {
      effective = Math.floor(effective * 0.25);
    }
    // 烧伤降物攻
    if (statName === 'attack' && this.status === 'burn') {
      effective = Math.floor(effective * 0.5);
    }

    return Math.max(1, effective);
  }

  // ===== HP =====

  get hpPercent() {
    return this.currentHP / this.stats.hp;
  }

  takeDamage(amount) {
    this.currentHP = Math.max(0, this.currentHP - amount);
  }

  heal(amount) {
    this.currentHP = Math.min(this.stats.hp, this.currentHP + amount);
  }

  get isFainted() {
    return this.currentHP <= 0;
  }

  // ===== 技能 =====

  /**
   * 获取可用技能（PP > 0）
   */
  getUsableMoves() {
    return this.moves.filter(m => m.pp > 0);
  }

  useMove(moveIndex) {
    if (moveIndex < 0 || moveIndex >= this.moves.length) return false;
    const move = this.moves[moveIndex];
    if (move.pp <= 0) return false;
    move.pp--;
    return true;
  }

  // ===== 异常状态 =====

  applyStatus(status) {
    if (this.status) return false; // 已有状态时不能叠加（除了部分特例）
    this.status = status;
    this.statusTurns = status === 'sleep' ? Math.floor(Math.random() * 3) + 1 : 0;
    this.badlyPoisonCounter = 1;
    return true;
  }

  clearStatus() {
    this.status = null;
    this.statusTurns = 0;
    this.badlyPoisonCounter = 0;
  }

  /**
   * 回合末异常状态伤害结算
   * @returns {number} 造成的伤害量
   */
  processStatusDamage() {
    let dmg = 0;
    switch (this.status) {
      case 'poison':
        dmg = Math.max(1, Math.floor(this.stats.hp / 8));
        break;
      case 'badly_poison':
        dmg = Math.max(1, Math.floor(this.stats.hp * this.badlyPoisonCounter / 16));
        this.badlyPoisonCounter++;
        break;
      case 'burn':
        dmg = Math.max(1, Math.floor(this.stats.hp / 16));
        break;
    }
    if (dmg > 0) this.takeDamage(dmg);
    return dmg;
  }

  /**
   * 检查是否可以行动（睡眠/冰冻/麻痹概率）
   * @returns {{ canAct: boolean, message: string }}
   */
  checkCanAct() {
    switch (this.status) {
      case 'sleep':
        if (this.statusTurns > 0) {
          this.statusTurns--;
          return { canAct: false, message: `${this.displayName} 正在睡觉！` };
        } else {
          this.clearStatus();
          return { canAct: true, message: `${this.displayName} 醒来了！` };
        }
      case 'freeze':
        if (Math.random() < 0.2) {
          this.clearStatus();
          return { canAct: true, message: `${this.displayName} 解冻了！` };
        }
        return { canAct: false, message: `${this.displayName} 被冻住了！` };
      case 'paralysis':
        if (Math.random() < 0.25) {
          return { canAct: false, message: `${this.displayName} 因麻痹无法动弹！` };
        }
        return { canAct: true, message: null };
      default:
        return { canAct: true, message: null };
    }
  }

  // ===== 经验与升级 =====

  _calcExpToNext(level) {
    // 中等成长速度
    return Math.floor(Math.pow(level, 3) * 0.8);
  }

  /**
   * 获得经验值，返回升级次数
   */
  gainExp(amount) {
    this.experience += amount;
    let leveled = 0;
    while (this.experience >= this._calcExpToNext(this.level + 1) && this.level < 100) {
      this.level++;
      leveled++;
      this.experienceToNext = this._calcExpToNext(this.level);
      const oldMaxHP = this.stats.hp;
      this.stats = this._calcStats();
      // 升级时增加对应的 HP
      this.currentHP += (this.stats.hp - oldMaxHP);
      this.currentHP = Math.min(this.currentHP, this.stats.hp);
    }
    return leveled;
  }

  // ===== 精灵图 =====

  _loadSprite(url, isBack) {
    const img = new Image();
    img.onload = () => {
      if (isBack) this._spriteBackImg = img;
      else this._spriteImg = img;
    };
    img.onerror = () => {};
    img.src = url;
  }

  getSprite(isBack = false) {
    return isBack ? this._spriteBackImg : this._spriteImg;
  }

  // ===== 序列化/反序列化 =====

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      types: this.types,
      baseStats: this.baseStats,
      level: this.level,
      experience: this.experience,
      currentHP: this.currentHP,
      moves: this.moves.map(m => ({ ...m })),
      status: this.status,
      statusTurns: this.statusTurns,
      badlyPoisonCounter: this.badlyPoisonCounter,
      catchRate: this.catchRate,
      evolutionData: this.evolutionData,
      ivs: this.ivs,
      spriteUrl: this.spriteUrl,
      spriteBackUrl: this.spriteBackUrl,
    };
  }

  static fromJSON(data) {
    return new Pokemon(data);
  }
}

window.Pokemon = Pokemon;
