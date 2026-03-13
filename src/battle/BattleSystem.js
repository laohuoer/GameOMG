/**
 * BattleSystem.js - 战斗核心逻辑状态机
 *
 * 状态机：
 * ENTER → PLAYER_TURN → PLAYER_ACTION → ENEMY_TURN → RESOLVE_ACTIONS
 * → CHECK_STATUS → CHECK_FAINT → BATTLE_END / PLAYER_TURN (循环)
 */
class BattleSystem {
  static STATES = {
    ENTER: 'enter',
    PLAYER_TURN: 'player_turn',
    PLAYER_MENU: 'player_menu',         // 主菜单（战斗/背包/宝可梦/逃跑）
    SELECT_MOVE: 'select_move',          // 选择技能
    SELECT_BALL: 'select_ball',          // 选择精灵球
    SWITCH_POKEMON: 'switch_pokemon',    // 换宝可梦
    ANIMATING: 'animating',             // 播放动画中
    MESSAGE: 'message',                 // 显示消息，等待确认
    CATCH_ANIMATION: 'catch_animation', // 捕捉动画
    BATTLE_END: 'battle_end',           // 战斗结束
    EVOLUTION: 'evolution',             // 进化中
  };

  constructor(moveCalculator, catchSystem) {
    this.moveCalc = moveCalculator;
    this.catchSystem = catchSystem;

    // 当前状态
    this.state = BattleSystem.STATES.ENTER;
    this.prevState = null;

    // 战斗参与者
    this.playerPokemon = null;
    this.enemyPokemon = null;
    this.player = null;

    // 消息队列
    this.messageQueue = [];
    this.currentMessage = '';

    // 动作队列
    this.actionQueue = [];

    // 选择状态
    this.selectedMenuIndex = 0;
    this.selectedMoveIndex = 0;
    this.selectedBallIndex = 0;

    // 是否野生战斗
    this.isWild = true;

    // 战斗结果
    this.result = null; // 'win' | 'lose' | 'run' | 'catch'

    // 捕捉动画状态
    this.catchAnim = {
      phase: 0,      // 0=飞出 1=摇晃 2=结果
      shakeCount: 0,
      maxShakes: 0,
      success: false,
      timer: 0,
      ballX: 0,
      ballY: 0,
      targetX: 0,
      targetY: 0,
    };

    // 消息确认回调
    this._msgCallback = null;

    // 动画完成回调
    this._animCallback = null;

    // 战斗结果回调
    this.onBattleEnd = null;
  }

  /**
   * 初始化战斗
   */
  initBattle(playerPokemon, enemyPokemon, player, isWild = true) {
    this.playerPokemon = playerPokemon;
    this.enemyPokemon = enemyPokemon;
    this.player = player;
    this.isWild = isWild;
    this.state = BattleSystem.STATES.ENTER;
    this.messageQueue = [];
    this.result = null;
    this.selectedMenuIndex = 0;
    this.selectedMoveIndex = 0;

    // 重置战斗能力变化
    this._resetBattleStats(playerPokemon);
    this._resetBattleStats(enemyPokemon);

    this._addMessage(`野生的 ${enemyPokemon.displayName} 出现了！`, () => {
      this._addMessage(`去吧！${playerPokemon.displayName}！`, () => {
        this.state = BattleSystem.STATES.PLAYER_MENU;
      });
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
  // 消息队列管理
  // ===========================

  _addMessage(text, callback = null) {
    this.messageQueue.push({ text, callback });
    if (this.state !== BattleSystem.STATES.MESSAGE && this.state !== BattleSystem.STATES.ANIMATING) {
      this._processNextMessage();
    }
  }

  _processNextMessage() {
    if (this.messageQueue.length === 0) {
      if (this._msgCallback) {
        const cb = this._msgCallback;
        this._msgCallback = null;
        cb();
      }
      return;
    }
    const msg = this.messageQueue.shift();
    this.currentMessage = msg.text;
    this._msgCallback = msg.callback;
    this.state = BattleSystem.STATES.MESSAGE;
  }

  /**
   * 确认当前消息（玩家按A）
   */
  confirmMessage() {
    if (this.state !== BattleSystem.STATES.MESSAGE) return;
    const cb = this._msgCallback;
    this._msgCallback = null;
    if (this.messageQueue.length > 0) {
      this._processNextMessage();
    } else if (cb) {
      cb();
    }
  }

  // ===========================
  // 菜单导航
  // ===========================

  navigateMenu(dir) {
    if (this.state === BattleSystem.STATES.PLAYER_MENU) {
      const max = 4; // 战斗/背包/宝可梦/逃跑
      this.selectedMenuIndex = (this.selectedMenuIndex + dir + max) % max;
    } else if (this.state === BattleSystem.STATES.SELECT_MOVE) {
      const max = this.playerPokemon.moves.length;
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
        } else {
          this._addMessage('对方训练家！不能使用道具！');
        }
        break;
      case 2: // 宝可梦
        this._addMessage('（换宝可梦功能预留）', () => {
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
      this._addMessage('没有 PP 了！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }

    // 扣 PP
    this.playerPokemon.useMove(moveIndex);

    // 先手判断（速度比较）
    const playerFirst = this.playerPokemon.getEffectiveStat('speed') >= this.enemyPokemon.getEffectiveStat('speed')
      || (move.priority || 0) > 0;

    // 选择敌方技能
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

  _execMove(attacker, defender, move, callback) {
    this._addMessage(`${attacker.displayName} 使用了 ${move.displayName || move.name}！`, () => {
      // 先检查能否行动
      const canActResult = attacker.checkCanAct();
      if (canActResult.message) {
        this._addMessage(canActResult.message);
      }

      if (!canActResult.canAct) {
        if (callback) callback();
        return;
      }

      // 命中检查
      const hit = this.moveCalc.checkAccuracy(attacker, defender, move);
      if (!hit) {
        this._addMessage(`${attacker.displayName} 的攻击没有命中！`, callback);
        return;
      }

      // 计算伤害
      const result = this.moveCalc.calcDamage(attacker, defender, move);

      if (result.effectiveness === 0) {
        this._addMessage(`对 ${defender.displayName} 没有效果...`, callback);
        return;
      }

      // 造成伤害
      if (result.damage > 0) {
        defender.takeDamage(result.damage);
      }

      // 效果文字
      const effectText = this.moveCalc.typeChart.getEffectivenessText(result.effectiveness);
      if (result.isCrit) {
        this._addMessage('暴击！');
      }
      if (effectText) {
        this._addMessage(effectText);
      }

      // 技能副效果
      const effectMsgs = this.moveCalc.applyMoveEffect(attacker, defender, move);
      effectMsgs.forEach(m => this._addMessage(m));

      if (callback) {
        if (this.messageQueue.length === 0) {
          callback();
        } else {
          // 等消息队列清空后再回调
          this._afterMessages(callback);
        }
      }
    });
  }

  _afterMessages(callback) {
    const check = () => {
      if (this.messageQueue.length === 0 && this.state !== BattleSystem.STATES.MESSAGE) {
        callback();
      } else {
        this._msgCallback = () => {
          if (this.messageQueue.length > 0) {
            this._processNextMessage();
            this._afterMessages(callback);
          } else {
            callback();
          }
        };
      }
    };
    check();
  }

  _selectEnemyMove() {
    const usable = this.enemyPokemon.getUsableMoves();
    if (usable.length === 0) {
      return { name: 'struggle', displayName: '挣扎', power: 50, type: 'normal', category: 'physical', accuracy: null, pp: 999 };
    }
    return usable[Math.floor(Math.random() * usable.length)];
  }

  _endOfTurn() {
    // 异常状态伤害结算
    const playerStatusDmg = this.playerPokemon.processStatusDamage();
    if (playerStatusDmg > 0) {
      const sName = StatusEffect.STATUS_NAMES[this.playerPokemon.status] || '';
      this._addMessage(`${this.playerPokemon.displayName} 因${sName}受到了 ${playerStatusDmg} 点伤害！`);
    }

    const enemyStatusDmg = this.enemyPokemon.processStatusDamage();
    if (enemyStatusDmg > 0) {
      const sName = StatusEffect.STATUS_NAMES[this.enemyPokemon.status] || '';
      this._addMessage(`${this.enemyPokemon.displayName} 因${sName}受到了 ${enemyStatusDmg} 点伤害！`);
    }

    // 检查昏厥
    if (this.playerPokemon.isFainted) {
      this._handlePlayerFaint();
    } else if (this.enemyPokemon.isFainted) {
      this._handleEnemyFaint();
    } else {
      this._afterMessages(() => {
        this.state = BattleSystem.STATES.PLAYER_MENU;
        this.selectedMenuIndex = 0;
      });
    }
  }

  _handleEnemyFaint() {
    this._addMessage(`${this.enemyPokemon.displayName} 昏倒了！`, () => {
      // 经验分配
      const expGain = this._calcExpGain(this.enemyPokemon);
      const leveled = this.playerPokemon.gainExp(expGain);
      this._addMessage(`${this.playerPokemon.displayName} 获得了 ${expGain} 经验！`, () => {
        if (leveled > 0) {
          this._addMessage(`${this.playerPokemon.displayName} 升到了 ${this.playerPokemon.level} 级！`, () => {
            this._checkEvolution();
          });
        } else {
          this._endBattle('win');
        }
      });
    });
  }

  _handlePlayerFaint() {
    this._addMessage(`${this.playerPokemon.displayName} 昏倒了！`, () => {
      const hasAlive = this.player.team.some(p => !p.isFainted && p !== this.playerPokemon);
      if (!hasAlive) {
        this._addMessage('所有宝可梦都昏倒了...', () => {
          this._endBattle('lose');
        });
      } else {
        // TODO: 换宝可梦
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
        this._addMessage(`${this.playerPokemon.displayName} 要进化了！`, () => {
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
      this._addMessage('无法逃跑！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }
    const playerSpeed = this.playerPokemon.getEffectiveStat('speed');
    const enemySpeed = this.enemyPokemon.getEffectiveStat('speed');
    const runChance = playerSpeed >= enemySpeed ? 1 : (playerSpeed * 128 / enemySpeed + 30) / 256;
    if (Math.random() < runChance) {
      this._addMessage('成功逃跑了！', () => { this._endBattle('run'); });
    } else {
      this._addMessage('没能逃掉！', () => {
        // 敌方攻击
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
    const ballTypes = Object.keys(this.player.bag.pokeballs || {})
      .filter(k => (this.player.bag.pokeballs[k] || 0) > 0);

    if (ballTypes.length === 0) {
      this._addMessage('背包里没有精灵球！', () => { this.state = BattleSystem.STATES.PLAYER_MENU; });
      return;
    }

    const ballType = ballTypes[ballIndex % ballTypes.length] || 'poke_ball';
    this.player.useItem('pokeballs', ballType);

    const ballName = CatchSystem.getBallName(ballType);
    this._addMessage(`扔出了${ballName}！`, () => {
      const result = this.catchSystem.attempt(this.enemyPokemon, ballType);

      // 开始捕捉动画状态
      this.state = BattleSystem.STATES.CATCH_ANIMATION;
      this.catchAnim.phase = 0;
      this.catchAnim.shakeCount = 0;
      this.catchAnim.maxShakes = result.shakes;
      this.catchAnim.success = result.success;
      this.catchAnim.timer = 0;
    });
  }

  /**
   * 捕捉动画更新（每帧调用）
   */
  updateCatchAnimation(dt) {
    if (this.state !== BattleSystem.STATES.CATCH_ANIMATION) return;
    this.catchAnim.timer += dt;

    switch (this.catchAnim.phase) {
      case 0: // 等待精灵球飞出动画（由 BattleUI 处理）
        if (this.catchAnim.timer > 1.5) {
          this.catchAnim.phase = 1;
          this.catchAnim.timer = 0;
        }
        break;
      case 1: // 摇晃阶段
        if (this.catchAnim.timer > 0.8) {
          this.catchAnim.timer = 0;
          this.catchAnim.shakeCount++;
          if (this.catchAnim.shakeCount >= this.catchAnim.maxShakes) {
            this.catchAnim.phase = 2;
          }
        }
        break;
      case 2: // 结果阶段
        if (this.catchAnim.timer > 1.0) {
          if (this.catchAnim.success) {
            this._addMessage(`${this.enemyPokemon.displayName} 被捕获了！`, () => {
              this._onCatchSuccess();
            });
          } else {
            this._addMessage(`${this.enemyPokemon.displayName} 破球而出了！`, () => {
              const enemyMove = this._selectEnemyMove();
              this._execMove(this.enemyPokemon, this.playerPokemon, enemyMove, () => {
                this._endOfTurn();
              });
            });
          }
          this.catchAnim.phase = 3;
        }
        break;
    }
  }

  _onCatchSuccess() {
    // 加入队伍或仓库
    if (this.player.team.length < 6) {
      this.enemyPokemon.isWild = false;
      this.player.addPokemonToTeam(this.enemyPokemon);
      this._addMessage(`${this.enemyPokemon.displayName} 加入了队伍！`, () => {
        this._endBattle('catch');
      });
    } else {
      this._addMessage(`${this.enemyPokemon.displayName} 被送到了宝可梦仓库！`, () => {
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
  // Update（每帧调用）
  // ===========================

  update(dt) {
    if (this.state === BattleSystem.STATES.CATCH_ANIMATION) {
      this.updateCatchAnimation(dt);
    }
  }
}

window.BattleSystem = BattleSystem;
