/**
 * BattleScene.js - 战斗场景
 * 整合 BattleSystem + BattleUI，处理输入与状态转换
 */
class BattleScene {
  constructor(canvas, sceneManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sceneManager = sceneManager;
    this.W = canvas.width;
    this.H = canvas.height;

    // 战斗核心组件
    this.typeChart = new TypeChart();
    this.moveCalc = new MoveCalculator(this.typeChart);
    this.catchSystem = new CatchSystem();
    this.battleSystem = new BattleSystem(this.moveCalc, this.catchSystem);

    // 战斗 UI
    this.battleUI = new BattleUI(canvas);

    // 回调
    this._onEnd = null;

    // 输入防抖
    this._inputCooldown = 0;
    this._inputCooldownMax = 0.15;
    this._menuNavCooldown = 0;
    this._menuNavRate = 0.15;

    // 战斗结束延迟
    this._endTimer = 0;
    this._endDelay = 1.5;
    this._ending = false;

    // 进化处理
    this._evolutionSystem = new EvolutionSystem();
    this._evolutionFactory = null; // 由 main 注入

    // 背景BGM占位
    this._bgColor = '#000';
  }

  onEnter(params = {}) {
    const { playerPokemon, enemyPokemon, player, isWild, onEnd, pokemonFactory } = params;

    this._onEnd = onEnd || null;
    this._ending = false;
    this._endTimer = 0;

    if (pokemonFactory) this._evolutionFactory = pokemonFactory;

    this.battleSystem.initBattle(playerPokemon, enemyPokemon, player, isWild !== false);
    this.battleSystem.onBattleEnd = (result) => {
      this._ending = true;
      this._endTimer = this._endDelay;
    };

    // 重置 HP 动画
    this.battleUI._playerHPAnim = playerPokemon.hpPercent;
    this.battleUI._enemyHPAnim = enemyPokemon.hpPercent;

    // 处理进化
    const bs = this.battleSystem;
    const origCheck = bs._checkEvolution.bind(bs);
    bs._checkEvolution = () => {
      const evo = new EvolutionSystem();
      const nextId = evo.checkLevelEvolution(bs.playerPokemon);
      if (nextId && this._evolutionFactory) {
        bs._addMessage(`${bs.playerPokemon.displayName} 要进化了！`, async () => {
          bs.state = BattleSystem.STATES.EVOLUTION;
          bs._evolutionData = { pokemon: bs.playerPokemon, nextId };

          await this._doEvolution(bs.playerPokemon, nextId);

          bs._addMessage(`${bs.playerPokemon.displayName} 进化完成！`, () => {
            bs._endBattle('win');
          });
        });
      } else {
        bs._endBattle('win');
      }
    };
  }

  async _doEvolution(pokemon, nextId) {
    if (!this._evolutionFactory) return;
    const result = await this._evolutionSystem.evolve(pokemon, nextId, this._evolutionFactory);
    if (result) {
      // 播放短暂进化动画（3秒）
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  onExit() {}

  update(dt, input) {
    this.battleSystem.update(dt);
    this.battleUI.update(dt, this.battleSystem);

    // 处理战斗结束
    if (this._ending) {
      this._endTimer -= dt;
      if (this._endTimer <= 0) {
        this._ending = false;
        if (this._onEnd) this._onEnd(this.battleSystem.result);
      }
      return;
    }

    this._inputCooldown -= dt;
    this._menuNavCooldown -= dt;

    const bs = this.battleSystem;
    const BS = BattleSystem.STATES;

    switch (bs.state) {
      case BS.MESSAGE:
        this.battleUI.dialogBox.show(bs.currentMessage);
        if (input.isActionJustPressed('a') && this._inputCooldown <= 0) {
          if (this.battleUI.dialogBox.isComplete) {
            bs.confirmMessage();
            this._inputCooldown = this._inputCooldownMax;
          } else {
            this.battleUI.dialogBox.skipAnimation();
          }
        }
        break;

      case BS.PLAYER_MENU:
      case BS.SELECT_MOVE:
      case BS.SELECT_BALL: {
        const dir = input.getDirection();
        if (this._menuNavCooldown <= 0) {
          if (dir.y !== 0 || dir.x !== 0) {
            const linearDir = dir.y !== 0 ? dir.y : dir.x;
            bs.navigateMenu(linearDir);
            this._menuNavCooldown = this._menuNavRate;
          }
        }
        if (input.isActionJustPressed('a') && this._inputCooldown <= 0) {
          bs.confirmSelection();
          this._inputCooldown = this._inputCooldownMax;
        }
        if (input.isActionJustPressed('b') && this._inputCooldown <= 0) {
          bs.cancelSelection();
          this._inputCooldown = this._inputCooldownMax;
        }
        break;
      }

      case BS.CATCH_ANIMATION:
        if (bs.catchAnim.phase === 3) {
          // 动画结束后，processMessage 会自动推进
        }
        break;

      case BS.EVOLUTION:
        // 进化动画期间阻止输入
        break;

      case BS.BATTLE_END:
        if (!this._ending) {
          this._ending = true;
          this._endTimer = 0.5;
        }
        break;
    }
  }

  render(ctx) {
    this.battleUI.render(ctx, this.battleSystem);
  }
}

window.BattleScene = BattleScene;
