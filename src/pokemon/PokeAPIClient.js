/**
 * PokeAPIClient.js - PokéAPI 请求封装 + localStorage 缓存
 */
class PokeAPIClient {
  constructor() {
    this.BASE_URL = 'https://pokeapi.co/api/v2';
    this.CACHE_PREFIX = 'pokeapi_cache_';
    this.CACHE_VERSION = 'v1_';
    this._pendingRequests = {};
  }

  /**
   * 通用 API 请求（带缓存）
   */
  async _fetch(url) {
    const cacheKey = this.CACHE_PREFIX + this.CACHE_VERSION + encodeURIComponent(url);

    // 读缓存
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) { /* 缓存读取失败则重新请求 */ }

    // 防止重复请求同一 URL
    if (this._pendingRequests[url]) {
      return this._pendingRequests[url];
    }

    const promise = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        // 写缓存
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
          // localStorage 满了，清理旧缓存
          this._cleanOldCache();
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
        }
        delete this._pendingRequests[url];
        return data;
      })
      .catch(err => {
        delete this._pendingRequests[url];
        console.error(`[PokeAPI] 请求失败: ${url}`, err);
        return null;
      });

    this._pendingRequests[url] = promise;
    return promise;
  }

  /**
   * 获取宝可梦基础数据
   * @param {number|string} id
   */
  async getPokemon(id) {
    return this._fetch(`${this.BASE_URL}/pokemon/${id}`);
  }

  /**
   * 获取宝可梦物种数据（含中文名、捕捉率、进化链）
   */
  async getPokemonSpecies(id) {
    return this._fetch(`${this.BASE_URL}/pokemon-species/${id}`);
  }

  /**
   * 获取进化链数据
   */
  async getEvolutionChain(id) {
    return this._fetch(`${this.BASE_URL}/evolution-chain/${id}`);
  }

  /**
   * 获取技能数据
   */
  async getMove(nameOrId) {
    return this._fetch(`${this.BASE_URL}/move/${nameOrId}`);
  }

  /**
   * 批量预加载第一世代151只宝可梦
   * @param {function} onProgress (current, total) => void
   */
  async preloadGen1(onProgress) {
    const results = [];
    const total = 151;
    for (let id = 1; id <= total; id++) {
      const data = await this.getPokemon(id);
      results.push(data);
      if (onProgress) onProgress(id, total);
      // 避免请求过于频繁
      await this._delay(50);
    }
    return results;
  }

  /**
   * 获取中文名称
   */
  static getChineseName(speciesData) {
    if (!speciesData || !speciesData.names) return null;
    const zhName = speciesData.names.find(n => n.language.name === 'zh-Hans' || n.language.name === 'zh-Hant');
    const jaName = speciesData.names.find(n => n.language.name === 'ja');
    return (zhName || jaName || speciesData.names[0])?.name || null;
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  _cleanOldCache() {
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.CACHE_PREFIX)) {
        keysToDelete.push(k);
      }
    }
    // 删除一半旧缓存
    const half = Math.ceil(keysToDelete.length / 2);
    for (let i = 0; i < half; i++) {
      localStorage.removeItem(keysToDelete[i]);
    }
  }
}

window.PokeAPIClient = PokeAPIClient;
