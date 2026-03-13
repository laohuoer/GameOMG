/**
 * BattleSystem.js - 战斗核心逻辑状态机（修复版）
 *
 * 消息队列设计：
 *   - 每条消息包含 { text, next } 其中 next 是显示完该条消息后自动执行的回调
 *   - confirmMessage() 消费当前消息：执行 next，next 内部可以 _addMessage 或切换状态
 *   - _addMessage 仅负责入队 + 若当前空闲则启动显示，不再有 _afterMessages
 */
class BattleSystem {
  static STATES = {
    ENTER: 'enter',
    PLAYER_MENU: 'player_menu',
    SELECT_MOVE: 'select_move',
    SELECT_BALL: 'select_ball',
    SWITCH_POKEMON: 'switch_pokemon',
    ANIMATING: 'animating',
    MESSAGE: 'message',
    CATCH_ANIMATION: 'catch_animation',
    BATTLE_END: 'battle_end',
    EVOLUTION: 'evolution',
  };

  constructor(moveCalculator, catchSystem) {
    this.moveCalc = moveCalculator;
    this.catchSystem = catchSystem;

    this.state = BattleSystem.STATES.ENTER;
    this.playerPokemon = null;
    this.enemyPokemon = null;
    this.player = null;

    // 消息队列 [{text, next}]
    this.messageQueue = [];
    this.currentMessage = '';
    this._currentNext = null; // 当前显示消息的 next 回调

    this.selectedMenuIndex = 0;
    this.selectedMoveIndex = 0;
    this.selectedBallIndex = 0;

    this.isWild = true;
    this.result = null;

    this.catchAnim = {
      phase: 0, shakeCount: 0, maxShakes: 0,
      success: false, timer: 0,
    };

    this.onBattleEnd = null;
    this._evolutionData = null;
  }

  // ===========================
  // 初始化
  // ===========================

  initBattle(playerPokemon, enemyPokemon, player, isWild = true) {
    this.playerPokemon = playerPokemon;
    this.enemyPokemon = enemyPokemon;
    this.player = player;
    this.isWild = isWild;
    this.state = BattleSystem.STATES.ENTER;
    this.messageQueue = [];
    this._currentNext = null;
    this.currentMessage = '';
    this.result = null;
    this.selectedMenuIndex = 0;
    this.selectedMoveIndex = 0;
    this._evolutionData = null;

    this._resetBattleStats(playerPokemon);
    this._resetBattleStats(enemyPokemon);

    // 入场消息链
    this._msg(`野生的 ${enemyPokemon.displayName} 出现了！`);
    this._msg(`去吧！${playerPokemon.displayName}！`, () => {
      this.state = BattleSystem.STATES.PLAYER_MENU;
    });
  }

  _resetBattleStats(pokemon) {
    pokemon.statStages = {
      attack: 0, defense: 0,
      specialAttack: 0, specialDefense: 0,
      speed: 0, accuracy: 0, evasion: 0,
    };
  }

  // ===========================
  // 消息队列（简化版）
  // ===========================

  /**
   * 添加一条消息到队列。
   * @param {string} text
   * @param {Function|null} next  该消息被玩家确认后执行的回调
   */
  _msg(text, next = null) {
    this.messageQueue.push({ text, next });
    // 如果当前不在显示消息，立即显示第一条
    if (this.state !== BattleSystem.STATES.MESSAGE) {
      this._showNextMessage();
    }
  }

  _showNextMessage() {
    if (this.messageQueue.length === 0) return;
    const item = this.messageQueue.shift();
    this.currentMessage = item.text;
    this._currentNext = item.next;
    this.state = BattleSystem.STATES.MESSAGE;
  }

  /**
   * 玩家按 A/Z 确认当前消息
   */
  confirmMessage() {
    if (this.state !== BattleSystem.STATES.MESSAGE) return;

    const next = this._currentNext;
    this._currentNext = null;
    this.currentMessage = '';

    // 先从队列中拉取下一条消息（如果有）
    if (this.messageQueue.length > 0) {
      this._showNextMessage();
    } else {
      // 队列空时，先切换到 IDLE 状态，再执行 next
      // 这样 next 内部的 _msg() 会因 state != MESSAGE 而自动调用 _showNextMessage
      this.state = BattleSystem.STATES.PLAYER_MENU; // 临时状态，next 会覆盖
    }

    // 执行 next 回调（可能入队新消息，或切换状态）
    if (next) next();

    // 如果 next 入队了新消息，但当前不在 MESSAGE 状态，手动启动显示
    if (this.messageQueue.length > 0 && this.state !== BattleSystem.STATES.MESSAGE) {
      this._showNextMessage();
    }
  }

  // ===========================
  // 菜单导航
  // ===========================

  navigateMenu(dir) {
    if (this.state === BattleSystem.STATES.PLAYER_MENU) {
      const max = 4;
      this.selectedMenuIndex = (this.selectedMenuIndex + dir + max) % max;
    } else if (this.state === BattleSystem.STATES.SELECT_MOVE) {
      const max = Math.max(1, this.playerPokemon.moves.length);
      this.selectedMoveIndex = (this.selectedMoveIndex + dir + max) % max;
    }
  }

  confirmSelection() {
    switch (this.state) {
      case BattleSystem.STATES.PLAYER_MENU:
        this._handleMenuSelection(this.selectedMenuIndex);
        break;
      case BattleSystem.STATES.SELECT_MOVE:
        this._executePlayerMove(this.selectedMoveIndex);
        break;
      case BattleSystem.STATES.SELECT_BALL:
        this._executeCatch(this.selectedBallIndex);
        break;
      case BattleSystem.STATES.MESSAGE:
        this.confirmMessage();
        break;
    }
  }

  cancelSelection() {
    if (this.state === BattleSystem.STATES.SELECT_MOVE) {
      this.state = BattleSystem.STATES.PLAYER_MENU;
    } else if (this.state === BattleSystem.STATES.SELECT_BALL) {
      this.state = BattleSystem.STATES.PLAYER_MENU;
    }
  }

  _handleMenuSelection(index) {
    switch (index) {
      case 0: // 战斗
        this.state = BattleSystem.STATES.SELECT_MOVE;
        this.selectedMoveIndex = 0;
        break;
      case 1: // 背包
        if (this.isWild) {
          this.state = BattleSystem.STATES.SELECT_BALL;
          this.selectedBallIndex = 0;
        } else {
          this._msg('对方训练家！不能使用道具！', () => {
            this.state = BattleSystem.STATES.PLAYER_MENU;
          });
        }
        break;
      case 2: // 宝可梦
        this._msg('（换宝可梦功能预留）', () => {
          this.state = BattleSystem.STATES.PLAYER_MENU;
        });
        break;
      case 3: // 逃跑
        this._tryRun();
        break;
    }
  }

  // ===========================
  // 战斗行动执行
  // ===========================

  _executePlayerMove(moveIndex) {
    const move = this.playerPokemon.moves[moveIndex];
    if (!move || move.pp <= 0) {
      this._msg('没有 PP 了！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }

    this.playerPokemon.useMove(moveIndex);

    const playerFirst = this.playerPokemon.getEffectiveStat('speed') >= this.enemyPokemon.getEffectiveStat('speed')
      || (move.priority || 0) > 0;

    const enemyMove = this._selectEnemyMove();

    if (playerFirst) {
      this._execMove(this.playerPokemon, this.enemyPokemon, move, () => {
        if (!this.enemyPokemon.isFainted) {
          this._execMove(this.enemyPokemon, this.playerPokemon, enemyMove, () => {
            this._endOfTurn();
          });
        } else {
          this._handleEnemyFaint();
        }
      });
    } else {
      this._execMove(this.enemyPokemon, this.playerPokemon, enemyMove, () => {
        if (!this.playerPokemon.isFainted) {
          this._execMove(this.playerPokemon, this.enemyPokemon, move, () => {
            this._endOfTurn();
          });
        } else {
          this._handlePlayerFaint();
        }
      });
    }
  }

  /**
   * 执行一次攻击，所有消息显示完后调用 callback
   */
  _execMove(attacker, defender, move, callback) {
    // 先检查能否行动（状态异常）
    const canActResult = attacker.checkCanAct();

    if (!canActResult.canAct) {
      const statusMsg = canActResult.message || `${attacker.displayName} 无法行动！`;
      this._msg(statusMsg, callback);
      return;
    }

    // 使用技能
    this._msg(`${attacker.displayName} 使用了 ${move.displayName || move.name}！`, () => {
      // 命中检查
      const hit = this.moveCalc.checkAccuracy(attacker, defender, move);
      if (!hit) {
        this._msg(`${attacker.displayName} 的攻击没有命中！`, callback);
        return;
      }

      // 计算伤害
      const result = this.moveCalc.calcDamage(attacker, defender, move);

      if (result.effectiveness === 0) {
        this._msg(`对 ${defender.displayName} 没有效果...`, callback);
        return;
      }

      // 造成伤害
      if (result.damage > 0) {
        defender.takeDamage(result.damage);
      }

      // 收集所有附加消息
      const extraMsgs = [];
      if (result.isCrit) extraMsgs.push('暴击！');
      const effectText = this.moveCalc.typeChart.getEffectivenessText(result.effectiveness);
      if (effectText) extraMsgs.push(effectText);

      const effectMsgs = this.moveCalc.applyMoveEffect(attacker, defender, move);
      extraMsgs.push(...effectMsgs);

      if (extraMsgs.length === 0) {
        // 无附加消息，直接执行回调
        if (callback) callback();
      } else {
        // 将附加消息依次入队，最后一条带 callback
        for (let i = 0; i < extraMsgs.length; i++) {
          const isLast = i === extraMsgs.length - 1;
          this._msg(extraMsgs[i], isLast ? callback : null);
        }
      }
    });
  }

  _selectEnemyMove() {
    const usable = this.enemyPokemon.getUsableMoves();
    if (usable.length === 0) {
      return { name: 'struggle', displayName: '挣扎', power: 50, type: 'normal', category: 'physical', accuracy: null, pp: 999 };
    }
    return usable[Math.floor(Math.random() * usable.length)];
  }

  _endOfTurn() {
    const msgs = [];

    const playerStatusDmg = this.playerPokemon.processStatusDamage();
    if (playerStatusDmg > 0) {
      const sName = StatusEffect.STATUS_NAMES[this.playerPokemon.status] || '';
      msgs.push({ text: `${this.playerPokemon.displayName} 因${sName}受到了 ${playerStatusDmg} 点伤害！` });
    }

    const enemyStatusDmg = this.enemyPokemon.processStatusDamage();
    if (enemyStatusDmg > 0) {
      const sName = StatusEffect.STATUS_NAMES[this.enemyPokemon.status] || '';
      msgs.push({ text: `${this.enemyPokemon.displayName} 因${sName}受到了 ${enemyStatusDmg} 点伤害！` });
    }

    const doCheck = () => {
      if (this.playerPokemon.isFainted) {
        this._handlePlayerFaint();
      } else if (this.enemyPokemon.isFainted) {
        this._handleEnemyFaint();
      } else {
        this.state = BattleSystem.STATES.PLAYER_MENU;
        this.selectedMenuIndex = 0;
      }
    };

    if (msgs.length === 0) {
      doCheck();
    } else {
      for (let i = 0; i < msgs.length; i++) {
        const isLast = i === msgs.length - 1;
        this._msg(msgs[i].text, isLast ? doCheck : null);
      }
    }
  }

  _handleEnemyFaint() {
    this._msg(`${this.enemyPokemon.displayName} 昏倒了！`, () => {
      const expGain = this._calcExpGain(this.enemyPokemon);
      const leveled = this.playerPokemon.gainExp(expGain);
      this._msg(`${this.playerPokemon.displayName} 获得了 ${expGain} 经验！`, () => {
        if (leveled > 0) {
          this._msg(`${this.playerPokemon.displayName} 升到了 ${this.playerPokemon.level} 级！`, () => {
            this._checkEvolution();
          });
        } else {
          this._endBattle('win');
        }
      });
    });
  }

  _handlePlayerFaint() {
    this._msg(`${this.playerPokemon.displayName} 昏倒了！`, () => {
      const hasAlive = this.player.team.some(p => !p.isFainted && p !== this.playerPokemon);
      if (!hasAlive) {
        this._msg('所有宝可梦都昏倒了...', () => {
          this._endBattle('lose');
        });
      } else {
        this._endBattle('lose');
      }
    });
  }

  _calcExpGain(defeated) {
    const base = defeated.baseStats ? Object.values(defeated.baseStats).reduce((a, b) => a + b, 0) : 200;
    return Math.floor(base * defeated.level / 7);
  }

  _checkEvolution() {
    if (window.EvolutionSystem) {
      const evo = new EvolutionSystem();
      const nextId = evo.checkLevelEvolution(this.playerPokemon);
      if (nextId) {
        this._msg(`${this.playerPokemon.displayName} 要进化了！`, () => {
          this.state = BattleSystem.STATES.EVOLUTION;
          this._evolutionData = { pokemon: this.playerPokemon, nextId };
        });
        return;
      }
    }
    this._endBattle('win');
  }

  _tryRun() {
    if (!this.isWild) {
      this._msg('无法逃跑！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }
    const playerSpeed = this.playerPokemon.getEffectiveStat('speed');
    const enemySpeed = this.enemyPokemon.getEffectiveStat('speed');
    const runChance = playerSpeed >= enemySpeed ? 1 : (playerSpeed * 128 / enemySpeed + 30) / 256;
    if (Math.random() < runChance) {
      this._msg('成功逃跑了！', () => { this._endBattle('run'); });
    } else {
      this._msg('没能逃掉！', () => {
        const enemyMove = this._selectEnemyMove();
        this._execMove(this.enemyPokemon, this.playerPokemon, enemyMove, () => {
          this._endOfTurn();
        });
      });
    }
  }

  // ===========================
  // 捕捉
  // ===========================

  _executeCatch(ballIndex) {
    const pokeballs = this.player.bag.pokeballs || {};
    const ballTypes = Object.keys(pokeballs).filter(k => (pokeballs[k] || 0) > 0);

    if (ballTypes.length === 0) {
      this._msg('背包里没有精灵球！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }

    const ballType = ballTypes[Math.min(ballIndex, ballTypes.length - 1)] || 'poke_ball';
    this.player.useItem('pokeballs', ballType);

    const ballName = CatchSystem.getBallName(ballType);
    this._msg(`扔出了${ballName}！`, () => {
      const result = this.catchSystem.attempt(this.enemyPokemon, ballType);
      this.state = BattleSystem.STATES.CATCH_ANIMATION;
      this.catchAnim.phase = 0;
      this.catchAnim.shakeCount = 0;
      this.catchAnim.maxShakes = result.shakes;
      this.catchAnim.success = result.success;
      this.catchAnim.timer = 0;
    });
  }

  updateCatchAnimation(dt) {
    if (this.state !== BattleSystem.STATES.CATCH_ANIMATION) return;
    this.catchAnim.timer += dt;

    switch (this.catchAnim.phase) {
      case 0:
        if (this.catchAnim.timer > 1.5) {
          this.catchAnim.phase = 1;
          this.catchAnim.timer = 0;
        }
        break;
      case 1:
        if (this.catchAnim.timer > 0.8) {
          this.catchAnim.timer = 0;
          this.catchAnim.shakeCount++;
          if (this.catchAnim.shakeCount >= this.catchAnim.maxShakes) {
            this.catchAnim.phase = 2;
          }
        }
        break;
      case 2:
        if (this.catchAnim.timer > 1.0) {
          this.catchAnim.phase = 3;
          if (this.catchAnim.success) {
            this._msg(`${this.enemyPokemon.displayName} 被捕获了！`, () => {
              this._onCatchSuccess();
            });
          } else {
            this._msg(`${this.enemyPokemon.displayName} 破球而出了！`, () => {
              const enemyMove = this._selectEnemyMove();
              this._execMove(this.enemyPokemon, this.playerPokemon, enemyMove, () => {
                this._endOfTurn();
              });
            });
          }
        }
        break;
    }
  }

  _onCatchSuccess() {
    if (this.player.team.length < 6) {
      this.enemyPokemon.isWild = false;
      this.player.addPokemonToTeam(this.enemyPokemon);
      this._msg(`${this.enemyPokemon.displayName} 加入了队伍！`, () => {
        this._endBattle('catch');
      });
    } else {
      this._msg(`${this.enemyPokemon.displayName} 被送到了宝可梦仓库！`, () => {
        this._endBattle('catch');
      });
    }
  }

  // ===========================
  // 战斗结束
  // ===========================

  _endBattle(result) {
    this.result = result;
    this.state = BattleSystem.STATES.BATTLE_END;
    if (this.onBattleEnd) this.onBattleEnd(result);
  }

  // ===========================
  // 每帧更新
  // ===========================

  update(dt) {
    if (this.state === BattleSystem.STATES.CATCH_ANIMATION) {
      this.updateCatchAnimation(dt);
    }
  }
}

window.BattleSystem = BattleSystem;
