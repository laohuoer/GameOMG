/**
 * PokemonFactory.js - 根据 PokéAPI 数据生成游戏内宝可梦实例
 */
class PokemonFactory {
  constructor(apiClient) {
    this.api = apiClient;

    // 内置中文名映射（作为 API 失败时的备用）
    this.chineseNames = {
      1:'妙蛙种子',2:'妙蛙草',3:'妙蛙花',4:'小火龙',5:'火恐龙',6:'喷火龙',
      7:'杰尼龟',8:'卡咪龟',9:'水箭龟',10:'绿毛虫',11:'铁壳蛹',12:'巴大蝶',
      13:'独角虫',14:'铁甲蛹',15:'大针蜂',16:'波波',17:'比比鸟',18:'大比鸟',
      19:'小拉达',20:'拉达',21:'烈雀',22:'大嘴雀',23:'阿柏蛇',24:'阿柏怪',
      25:'皮卡丘',26:'雷丘',27:'穿山鼠',28:'穿山王',29:'尼多兰',30:'尼多娜',
      31:'尼多后',32:'尼多朗',33:'尼多力诺',34:'尼多王',35:'皮皮',36:'胖丁',
      37:'六尾',38:'九尾',39:'胖可丁',40:'胖大可',41:'超音蝠',42:'大嘴蝠',
      43:'走路草',44:'臭臭花',45:'霸王花',46:'派拉斯',47:'派拉斯特',
      48:'毛球',49:'安穆',50:'地鼠',51:'三地鼠',52:'喵喵',53:'猫老大',
      54:'可达鸭',55:'哥达鸭',56:'猴怪',57:'火爆猴',58:'卡蒂狗',59:'风速狗',
      60:'蚊香蝌蚪',61:'蚊香君',62:'蚊香泳士',63:'凯西',64:'勇基拉',65:'胡地',
      66:'腕力',67:'豪力',68:'怪力',69:'毒刺水母',70:'毒害水母',71:'大食花',
      72:'海刺龙',73:'毒刺水母2',74:'小拳石',75:'隆隆石',76:'隆隆岩',
      77:'小火马',78:'火炎马',79:'呆呆兽',80:'呆壳兽',81:'小磁怪',82:'三磁怪',
      83:'大葱鸭',84:'嘟嘟',85:'嘟嘟利',86:'小海狮',87:'白海狮',88:'臭泥',
      89:'臭臭泥',90:'大舌贝',91:'刺甲贝',92:'鬼斯',93:'鬼斯通',94:'耿鬼',
      95:'大岩蛇',96:'催眠貘',97:'引梦貘人',98:'大钳蟹',99:'大钳蟹2',
      100:'霹雳电球',101:'顿重球',102:'蛋蛋',103:'椰蛋树',104:'卡拉卡拉',
      105:'嘎啦嘎啦',106:'飞腿郎',107:'快拳郎',108:'舔舔',109:'毒瓦斯',
      110:'双弹瓦斯',111:'独角犀牛',112:'大犀角',113:'吉利蛋',114:'蔓藤怪',
      115:'袋龙',116:'小海龙',117:'海刺龙2',118:'角金鱼',119:'金鱼王',
      120:'海星星',121:'宝石海星',122:'魔墙人偶',123:'飞天螳螂',124:'迷唇姐',
      125:'电击兽',126:'鸭嘴焰兽',127:'凯罗斯',128:'肯泰罗',129:'鲤鱼王',
      130:'暴鲤龙',131:'乘龙',132:'百变怪',133:'伊布',134:'水精灵',135:'雷精灵',
      136:'火精灵',137:'多边兽',138:'菊石兽',139:'多刺菊石兽',140:'化石盔',
      141:'镰刀盔',142:'化石翼龙',143:'卡比兽',144:'急冻鸟',145:'闪电鸟',
      146:'火焰鸟',147:'迷你龙',148:'哈克龙',149:'快龙',150:'超梦',151:'梦幻',
    };

    // 内置技能数据（减少 API 请求）
    this.defaultMoves = {
      'tackle':    { name:'tackle', displayName:'撞击', power:40, type:'normal', category:'physical', accuracy:100, pp:35, effect:null },
      'growl':     { name:'growl', displayName:'叫声', power:0, type:'normal', category:'status', accuracy:100, pp:40, effect:{ statChanges:{ attack:-1 } } },
      'scratch':   { name:'scratch', displayName:'抓', power:40, type:'normal', category:'physical', accuracy:100, pp:35, effect:null },
      'ember':     { name:'ember', displayName:'火花', power:40, type:'fire', category:'special', accuracy:100, pp:25, effect:{ status:'burn', statusChance:0.1 } },
      'water-gun': { name:'water-gun', displayName:'水枪', power:40, type:'water', category:'special', accuracy:100, pp:25, effect:null },
      'vine-whip': { name:'vine-whip', displayName:'藤鞭', power:45, type:'grass', category:'physical', accuracy:100, pp:25, effect:null },
      'thunder-shock':{ name:'thunder-shock', displayName:'电击', power:40, type:'electric', category:'special', accuracy:100, pp:30, effect:{ status:'paralysis', statusChance:0.1 } },
      'quick-attack':{ name:'quick-attack', displayName:'极速', power:40, type:'normal', category:'physical', accuracy:100, pp:30, priority:1, effect:null },
      'gust':      { name:'gust', displayName:'一阵风', power:40, type:'flying', category:'special', accuracy:100, pp:35, effect:null },
      'poison-sting':{ name:'poison-sting', displayName:'毒针', power:15, type:'poison', category:'physical', accuracy:100, pp:35, effect:{ status:'poison', statusChance:0.3 } },
      'wing-attack':{ name:'wing-attack', displayName:'飞翼攻击', power:60, type:'flying', category:'physical', accuracy:100, pp:35, effect:null },
      'bubble':    { name:'bubble', displayName:'泡沫', power:40, type:'water', category:'special', accuracy:100, pp:30, effect:{ statChanges:{ speed:-1 }, statusChance:0.1 } },
      'razor-leaf':{ name:'razor-leaf', displayName:'飞叶快刀', power:55, type:'grass', category:'physical', accuracy:95, pp:25, critRatio:2, effect:null },
      'flamethrower':{ name:'flamethrower', displayName:'喷射火焰', power:90, type:'fire', category:'special', accuracy:100, pp:15, effect:{ status:'burn', statusChance:0.1 } },
      'surf':      { name:'surf', displayName:'冲浪', power:90, type:'water', category:'special', accuracy:100, pp:15, effect:null },
      'solar-beam':{ name:'solar-beam', displayName:'日光束', power:120, type:'grass', category:'special', accuracy:100, pp:10, effect:null },
      'thunderbolt':{ name:'thunderbolt', displayName:'十万伏特', power:90, type:'electric', category:'special', accuracy:100, pp:15, effect:{ status:'paralysis', statusChance:0.1 } },
      'ice-beam':  { name:'ice-beam', displayName:'冰冻光束', power:90, type:'ice', category:'special', accuracy:100, pp:10, effect:{ status:'freeze', statusChance:0.1 } },
      'psychic':   { name:'psychic', displayName:'精神强念', power:90, type:'psychic', category:'special', accuracy:100, pp:10, effect:{ statChanges:{ specialDefense:-1 }, statusChance:0.1 } },
      'bite':      { name:'bite', displayName:'咬击', power:60, type:'dark', category:'physical', accuracy:100, pp:25, effect:null },
      'leer':      { name:'leer', displayName:'瞪眼', power:0, type:'normal', category:'status', accuracy:100, pp:30, effect:{ statChanges:{ defense:-1 } } },
    };
  }

  /**
   * 从 API 数据创建宝可梦实例
   * @param {number} pokemonId
   * @param {number} level
   * @param {boolean} isWild
   */
  async createFromAPI(pokemonId, level = 5, isWild = true) {
    try {
      const [apiData, speciesData] = await Promise.all([
        this.api.getPokemon(pokemonId),
        this.api.getPokemonSpecies(pokemonId),
      ]);

      if (!apiData) return this.createDefault(pokemonId, level, isWild);

      // 解析属性
      const types = apiData.types.map(t => t.type.name);

      // 解析基础值
      const statsMap = {};
      for (const s of apiData.stats) {
        const key = this._mapStatName(s.stat.name);
        statsMap[key] = s.base_stat;
      }

      // 获取中文名
      let displayName = this.chineseNames[pokemonId] || apiData.name;
      if (speciesData) {
        const zhName = PokeAPIClient.getChineseName(speciesData);
        if (zhName) displayName = zhName;
      }

      // 捕捉率
      const catchRate = speciesData ? speciesData.capture_rate : 45;

      // 技能列表（选取合适等级的技能，最多4个）
      const moves = this._selectMoves(apiData.moves, level);

      // 精灵图
      const spriteUrl = apiData.sprites?.front_default || null;
      const spriteBackUrl = apiData.sprites?.back_default || null;

      return new Pokemon({
        id: pokemonId,
        name: apiData.name,
        displayName,
        types,
        baseStats: {
          hp: statsMap.hp || 45,
          attack: statsMap.attack || 50,
          defense: statsMap.defense || 50,
          specialAttack: statsMap.specialAttack || 50,
          specialDefense: statsMap.specialDefense || 50,
          speed: statsMap.speed || 45,
        },
        level,
        moves,
        catchRate,
        isWild,
        spriteUrl,
        spriteBackUrl,
      });
    } catch (e) {
      console.error(`[PokemonFactory] 创建宝可梦 ${pokemonId} 失败:`, e);
      return this.createDefault(pokemonId, level, isWild);
    }
  }

  /**
   * 创建默认宝可梦（API 不可用时）
   */
  createDefault(pokemonId, level = 5, isWild = true) {
    const defaultData = this._getDefaultData(pokemonId);
    return new Pokemon({
      id: pokemonId,
      name: defaultData.name,
      displayName: this.chineseNames[pokemonId] || defaultData.name,
      types: defaultData.types,
      baseStats: defaultData.baseStats,
      level,
      moves: defaultData.moves,
      catchRate: defaultData.catchRate || 45,
      isWild,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
      spriteBackUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`,
    });
  }

  _selectMoves(apiMoves, level) {
    if (!apiMoves || apiMoves.length === 0) {
      return [this.defaultMoves['tackle']];
    }

    // 按等级过滤可学技能
    const levelMoves = apiMoves
      .filter(m => {
        const detail = m.version_group_details.find(d =>
          d.move_learn_method.name === 'level-up' && d.level_learned_at <= level
        );
        return !!detail;
      })
      .sort((a, b) => {
        const da = a.version_group_details.find(d => d.move_learn_method.name === 'level-up');
        const db = b.version_group_details.find(d => d.move_learn_method.name === 'level-up');
        return (db?.level_learned_at || 0) - (da?.level_learned_at || 0);
      })
      .slice(0, 4);

    const moves = levelMoves.map(m => {
      const moveName = m.move.name;
      // 优先使用内置数据
      if (this.defaultMoves[moveName]) return { ...this.defaultMoves[moveName] };
      // 否则创建基础条目
      return {
        name: moveName,
        displayName: moveName.replace(/-/g, ' '),
        power: 40,
        type: 'normal',
        category: 'physical',
        accuracy: 100,
        pp: 30,
        effect: null,
      };
    });

    if (moves.length === 0) moves.push({ ...this.defaultMoves['tackle'] });
    return moves;
  }

  _mapStatName(apiName) {
    const map = {
      'hp': 'hp',
      'attack': 'attack',
      'defense': 'defense',
      'special-attack': 'specialAttack',
      'special-defense': 'specialDefense',
      'speed': 'speed',
    };
    return map[apiName] || apiName;
  }

  _getDefaultData(id) {
    // 对几个常见宝可梦提供完整默认数据
    const defaults = {
      25: { name:'pikachu', types:['electric'], baseStats:{hp:35,attack:55,defense:40,specialAttack:50,specialDefense:50,speed:90}, catchRate:190,
            moves:[this.defaultMoves['thunder-shock'], this.defaultMoves['quick-attack'], this.defaultMoves['tackle'], this.defaultMoves['growl']] },
      4:  { name:'charmander', types:['fire'], baseStats:{hp:39,attack:52,defense:43,specialAttack:60,specialDefense:50,speed:65}, catchRate:45,
            moves:[this.defaultMoves['scratch'], this.defaultMoves['growl'], this.defaultMoves['ember'], this.defaultMoves['leer']] },
      7:  { name:'squirtle', types:['water'], baseStats:{hp:44,attack:48,defense:65,specialAttack:50,specialDefense:64,speed:43}, catchRate:45,
            moves:[this.defaultMoves['tackle'], this.defaultMoves['growl'], this.defaultMoves['water-gun'], this.defaultMoves['bubble']] },
      1:  { name:'bulbasaur', types:['grass','poison'], baseStats:{hp:45,attack:49,defense:49,specialAttack:65,specialDefense:65,speed:45}, catchRate:45,
            moves:[this.defaultMoves['tackle'], this.defaultMoves['growl'], this.defaultMoves['vine-whip'], this.defaultMoves['leer']] },
    };
    return defaults[id] || {
      name: `pokemon_${id}`,
      types: ['normal'],
      baseStats: { hp:45, attack:50, defense:50, specialAttack:50, specialDefense:50, speed:45 },
      catchRate: 45,
      moves: [this.defaultMoves['tackle'], this.defaultMoves['growl']],
    };
  }
}

window.PokemonFactory = PokemonFactory;
