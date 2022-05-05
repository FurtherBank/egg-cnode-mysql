'use strict';

const Service = require('egg').Service;

class TopicCollectService extends Service {
  getTopicCollect(userId, topicId) {
    const query = { author_id: userId, topic_id: parseInt(topicId) };
    return this.ctx.model.TopicCollect.findOne({ where: query });
  }

  getTopicCollectsByUserId(userId, opt) {
    const query = { where: { author_id: userId }, order: [[ 'createdAt', 'DESC' ]] };
    const option = Object.assign(query, opt);
    return this.ctx.model.TopicCollect.findAll(
      option
    );
  }

  /**
   * 移除一个话题的收藏
   * @param {string} userId 删除的用户名
   * @param {number | string} topicId 删除的话题 id
   * @return {Promise<number>}	The number of destroyed rows
   */
  remove(userId, topicId) {
    const query = { author_id: userId, topic_id: parseInt(topicId) };
    return this.ctx.model.TopicCollect.destroy({ where: query });
  }
}

module.exports = TopicCollectService;
