'use strict';

const Service = require('egg').Service;

class ReplyService extends Service {

  /**
   * 根据回复ID，获取回复
   * @param {string} id 回复ID
   * @return {Promise[reply]} 承载 replay 的 Promise 对象
   */
  async getReply(id) {
    if (!id) {
      return null;
    }

    const reply = await this.ctx.model.Reply.findOne({
      where: { id: parseInt(id) },
      include: { all: true },
    });

    if (!reply) {
      return null;
    }

    // TODO: 添加更新方法，有些旧帖子可以转换为markdown格式的内容
    if (reply.content_is_html) {
      return reply;
    }

    const str = this.service.at.linkUsers(reply.content);
    reply.content = str;
    return reply;
  }

  /**
   * 根据主题ID，获取回复列表
   * Callback:
   * - err, 数据库异常
   * - replies, 回复列表
   * @param {String} id 主题ID
   * @return {Promise[replies]} 承载 replay 列表的 Promise 对象
   */
  async getRepliesByTopicId(id) {
    if (!id) return [];
    const query = { topic_id: parseInt(id), deleted: false };
    let replies = await this.ctx.model.Reply.findAll({
      where: query,
      order: [[ 'createdAt' ]],
      include: { all: true },
    });

    replies = replies.filter(function(item) {
      return !item.content_is_html;
    });

    return Promise.all(
      replies.map(async item => {
        const author = await this.service.user.getUserByLoginName(item.author_id);
        item.author = author || { loginname: '' };

        item.content = await this.service.at.linkUsers(item.content);
        return item;
      })
    );
  }

  /**
   * 创建并保存一条回复信息
   * @param {string} content 回复内容
   * @param {string} topicId 主题ID
   * @param {string} authorId 回复作者
   * @param {string} [replyId] 回复ID，当二级回复时设定该值
   * @return {Promise} 承载 replay 列表的 Promise 对象
   */
  async newAndSave(content, topicId, authorId, replyId = null) {
    const reply = await this.ctx.model.Reply.create({
      content,
      topic_id: parseInt(topicId),
      author_id: authorId,
      reply_id: replyId ? parseInt(replyId) : null,
    });

    return reply;
  }

  /**
   * 根据topicId查询到最新的一条未删除回复
   * @param topicId 主题ID
   * @return {Promise[reply]} 承载 replay 的 Promise 对象
   */
  async getLastReplyByTopId(topicId) {
    if (!topicId) return null;
    const query = { topic_id: parseInt(topicId), deleted: false };
    return this.ctx.model.Reply.findOne({
      where: query,
      order: [[ 'createdAt', 'DESC' ]],
      include: { all: true },
    });
  }

  /**
   * 根据被回复者用户名查询所有的相关回复
   * @param {string} author 被回复者用户名
   * @param authorId
   * @param {any} opt 查找选项
   * @return {Promise<reply>} 承载 reply 的 Promise 对象
   */
  getRepliesByAuthorId(authorId, opt = {}) {
    const options = Object.assign({
      where: { author_id: authorId },
      order: [[ 'createdAt', 'DESC' ]],
      include: { all: true },
    }, opt);
    return this.ctx.model.Reply.findAll(options);
  }

  // 通过 author_id 获取回复总数
  getCountByAuthorId(authorId) {
    return this.ctx.model.Reply.count({ where: { author_id: authorId } });
  }
}

module.exports = ReplyService;
