'use strict';

const Service = require('egg').Service;

class CacheService extends Service {
  /**
   * 从 redis 中获取数据
   * @param {string} key 访问的键
   * @return 键值
   */
  async get(key) {
    const { redis, logger } = this.app;
    const t = Date.now();
    let data = await redis.get(key);
    if (!data) return;
    data = JSON.parse(data);
    const duration = (Date.now() - t);
    logger.debug('Cache', 'get', key, (duration + 'ms').green);
    return data;
  }

  /**
   * 存取数据到 redis 中，并设置过期时间(秒)
   * @param {string} key 存储键
   * @param {any} value 存储值
   * @param {number} seconds 过期时间
   */
  async setex(key, value, seconds) {
    const { redis, logger } = this.app;
    const t = Date.now();
    value = JSON.stringify(value);
    await redis.set(key, value, 'EX', seconds);
    const duration = (Date.now() - t);
    logger.debug('Cache', 'set', key, (duration + 'ms').green);
  }

  /**
   * 给特定键值 +1，并重新设置过期时间。
   * @param {string} key 存储键
   * @param {number} seconds 过期时间
   * @return 更新后的值
   */
  async incr(key, seconds) {
    const { redis, logger } = this.app;
    const t = Date.now();
    const result = await redis.multi().incr(key).expire(key, seconds)
      .exec();
    const duration = (Date.now() - t);
    logger.debug('Cache', 'set', key, (duration + 'ms').green);
    return result[0][1];
  }
}

module.exports = CacheService;
