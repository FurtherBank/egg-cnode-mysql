'use strict';

const Service = require('egg').Service;

/**
 * type:
 * reply: xx 回复了你的话题
 * reply2: xx 在话题中回复了你
 * follow: xx 关注了你
 * at: xx ＠了你
 * activite: 需要重新激活
 */

class MessageService extends Service {
  /**
   * 根据用户ID，获取未读消息的数量
   * @param {string} loginname 用户ID
   * @return {Promise[messagesCount]} 承载消息列表的 Promise 对象
   */
  async getMessagesCount(loginname = '') {
    if (!loginname) return 0;
    return this.ctx.model.Message.count({
      where: {
        master_id: loginname,
        has_read: false,
      },
    });
  }


  /**
   * 根据消息Id获取消息
   * @param {String} id 消息ID
   * @return {Promise<message>} 承载消息的 Promise 对象
   */
  async getMessageById(id) {
    id = parseInt(id);
    if (!id) return null;
    return this.ctx.model.Message.findOne({
      where: { id },
      include: { all: true },
    });
  }

  /**
   * 根据用户ID，获取已读消息列表
   * @param {String} userId 用户ID
   * @return {Promise[messages]} 承载消息列表的 Promise 对象
   */
  getReadMessagesByUserId(userId = '') {
    if (!userId) return [];
    const query = { master_id: userId, has_read: true };
    return this.ctx.model.Message.findAll({
      where: query,
      order: [[ 'createdAt', 'DESC' ]],
      limit: 20,
      include: { all: true },
    });
  }

  /**
   * 根据用户ID，获取未读消息列表
   * @param {String} userId 用户ID
   * @return {Promise[messages]} 承载消息列表的 Promise 对象
   */
  getUnreadMessagesByUserId(userId = '') {
    if (!userId) return [];
    const query = { master_id: userId, has_read: false };
    return this.ctx.model.Message.findAll({
      where: query,
      order: [[ 'createdAt', 'DESC' ]],
      include: { all: true },
    });
  }

  /**
   * 将消息设置成已读
   * @param userId
   * @param messages
   * @return {Promise[messages]} 承载消息列表的 Promise 对象
   */
  async updateMessagesToRead(userId, messages) {
    if (messages.length === 0) {
      return;
    }

    await Promise.all(messages.map(messageModel => {
      return messageModel.update({ has_read: true });
    }));

    return messages;
  }

  /**
   * 将单个消息设置成已读
   * @param {String} msgId 消息 ID
   * @return {Promise<number>} 更新消息数目的 Promise 对象
   */
  async updateOneMessageToRead(msgId) {
    if (!msgId) {
      return;
    }
    const query = { where: { id: parseInt(msgId) } };
    const update = { has_read: true };
    const [ result ] = await this.ctx.model.Message.update(update, query);
    return result;
  }

  /**
   * 给用户发送 信息
   * @param {string} type 信息类型
   * @param {string} userId 用户名
   * @param {string} authorId 被 @ 的用户名
   * @param {number} topicId 话题id
   * @param {number} replyId 回复id
   * @return 信息对象
   */
  async sendMessage(type, userId, authorId, topicId, replyId) {
    topicId = topicId ? parseInt(topicId) : null;
    replyId = replyId ? parseInt(replyId) : null;
    if ((!topicId && topicId !== null) || (!replyId && replyId !== null)) return null;
    return this.ctx.model.Message.create({
      type,
      master_id: userId,
      author_id: authorId,
      topic_id: topicId,
      reply_id: replyId,
    });
  }

  async sendActivateMessage(userId) {
    return this.ctx.model.Message.create({
      type: 'activate',
      master_id: userId,
    });
  }

  async sendBindMessage(userId) {
    if (!userId) return null;
    const user = await this.ctx.model.User.findOne({
      where: {
        loginname: userId,
      },
    });
    return this.ctx.model.Message.create({
      type: 'bind',
      master_id: userId,
      github: user.githubUsername,
    });
  }
}

module.exports = MessageService;
