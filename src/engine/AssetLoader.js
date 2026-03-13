/**
 * AssetLoader.js - 资源预加载管理器
 * 支持图片、JSON 文件的批量预加载，带进度回调
 */
class AssetLoader {
  constructor() {
    this.images = {};
    this.jsons = {};
    this.total = 0;
    this.loaded = 0;
    this.onProgress = null; // (progress 0-1, message) => void
  }

  /**
   * 加载图片资源
   * @param {string} key
   * @param {string} url
   */
  addImage(key, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        this._tick(`图片: ${key}`);
        resolve(img);
      };
      img.onerror = () => {
        // 加载失败时创建空白图片，不阻塞游戏
        console.warn(`[AssetLoader] 图片加载失败: ${url}，使用占位图`);
        this.images[key] = this._createPlaceholderImage(key);
        this._tick(`图片(占位): ${key}`);
        resolve(this.images[key]);
      };
      img.src = url;
    });
  }

  /**
   * 加载 JSON 资源
   * @param {string} key
   * @param {string} url
   */
  async addJSON(key, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.jsons[key] = data;
      this._tick(`JSON: ${key}`);
      return data;
    } catch (e) {
      console.warn(`[AssetLoader] JSON加载失败: ${url} - ${e.message}`);
      this.jsons[key] = null;
      this._tick(`JSON(失败): ${key}`);
      return null;
    }
  }

  /**
   * 批量加载，返回 Promise
   * @param {Array} manifest [{type:'image'|'json', key, url}]
   */
  async loadAll(manifest, onProgress) {
    this.total = manifest.length;
    this.loaded = 0;
    this.onProgress = onProgress || null;

    const tasks = manifest.map(item => {
      if (item.type === 'image') return this.addImage(item.key, item.url);
      if (item.type === 'json') return this.addJSON(item.key, item.url);
      return Promise.resolve();
    });

    await Promise.all(tasks);
    return { images: this.images, jsons: this.jsons };
  }

  _tick(msg) {
    this.loaded++;
    const progress = this.total > 0 ? this.loaded / this.total : 1;
    if (this.onProgress) this.onProgress(progress, msg);
  }

  /**
   * 创建带文字的占位图片（Canvas生成）
   */
  _createPlaceholderImage(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#666';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#f00';
    ctx.font = '8px monospace';
    ctx.fillText('?', 28, 36);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  getImage(key) {
    return this.images[key] || null;
  }

  getJSON(key) {
    return this.jsons[key] || null;
  }
}

window.AssetLoader = AssetLoader;
