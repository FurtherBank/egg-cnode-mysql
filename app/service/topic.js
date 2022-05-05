'use strict';

const Service = require('egg').Service;
const qiniu = require('qiniu');

class TopicService extends Service {
  /**
   * 根据主题ID获取主题
   * @param {string | number} id 主题ID
   */
  async getTopicById(id) {
    id = parseInt(id);
    if (!id) {
      return {
        topic: null,
        author: null,
        last_reply: null,
      };
    }

    const topic = await this.ctx.model.Topic.findOne({ where: { id } });
    if (!topic) {
      return {
        topic: null,
        author: null,
        last_reply: null,
      };
    }

    const author = await this.service.user.getUserByLoginName(topic.author_id);

    let last_reply = null;
    if (topic.last_reply) {
      last_reply = await this.service.reply.getReply(topic.last_reply);
    }

    return {
      topic,
      author,
      last_reply,
    };
  }

  /**
   * 获取关键词能搜索到的主题数量
   * @param {String} query 搜索关键词
   */
  getCountByQuery(query) {
    return this.ctx.model.Topic.count({ where: query });
  }

  /**
   * 根据关键词，获取主题列表
   * @param {String} query 搜索关键词
   * @param {Object} opt 搜索选项
   */
  async getTopicsByQuery(query, opt) {
    query.deleted = false;
    const options = Object.assign({
      where: query,
      include: [
        {
          model: this.ctx.model.User,
          as: 'author',
        },
        {
          model: this.ctx.model.Reply,
          include: {
            all: true,
          },
        },
        this.ctx.model.Message,
      ],
    }, opt);
    const topics = await this.ctx.model.Topic.findAll(options);

    if (topics.length === 0) {
      return [];
    }

    await Promise.all(
      topics.map(async topic => {
        topic.last_reply = await this.service.reply.getReply(topic.last_reply);
      })
    );

    return topics.filter(item => {
      // 删除不合规的 topic
      return !!item.author;
    });
  }

  // for sitemap
  getLimit5w() {
    const query = { deleted: false };
    return this.ctx.model.Topic.findAll({
      where: query,
      limit: 50000,
      order: [[ 'createdAt', 'DESC' ]],
    });
  }

  /**
   * 获取所有信息的主题
   * Callback:
   * - err, 数据库异常
   * - message, 消息
   * - topic, 主题
   * - author, 主题作者
   * - replies, 主题的回复
   * @param {String} id 主题ID
   * @param {Function} callback 回调函数
   * @return [topic, author, replies]
   */
  async getFullTopic(id) {
    id = parseInt(id);
    if (!id) return null;

    const query = { id, deleted: false };
    const topic = await this.ctx.model.Topic.findOne({
      where: query,
      include: [
        {
          model: this.ctx.model.User,
          as: 'author',
        },
        {
          model: this.ctx.model.Reply,
          include: {
            all: true,
          },
        },
        this.ctx.model.Message,
      ],
    });

    if (!topic || !topic.author) {
      // throw new Error('此话题不存在或已被删除。');
      return null;
    }

    topic.linkedContent = this.service.at.linkUsers(topic.content);

    return topic;
  }

  /**
   * 更新主题的最后回复信息
   * @param {String} topicId 主题ID
   * @param {String} replyId 回复ID
   * @return 更新结果
   */
  async updateLastReply(topicId = 0, replyId = 0) {
    topicId = parseInt(topicId);
    if (!topicId) return 0;
    const s = this.app.Sequelize;
    const update = {
      last_reply: replyId,
      last_reply_at: new Date(),
      reply_count: s.literal('`reply_count` + 1'),
    };
    const [ result ] = await this.ctx.model.Topic.update(update, { where: { id: topicId } });
    return result;
  }

  /**
   * 根据主题ID，查找一条主题
   * @param {String} id 主题ID
   */
  async getTopic(id) {
    id = parseInt(id);
    if (!id) return null;
    return this.ctx.model.Topic.findOne({ where: { id } });
  }

  /**
   * 将当前主题的回复计数减1，并且更新最后回复的用户，删除回复时用到
   * @param {string} id 主题ID
   * @return {number} 更新的情况
   */
  async reduceCount(id = 0) {
    const s = this.app.Sequelize;
    const update = { reply_count: s.literal('`reply_count` - 1') };
    const reply = await this.service.reply.getLastReplyByTopId(id);
    if (reply) {
      update.last_reply = reply.id;
    } else {
      update.last_reply = null;
    }

    const topic = await this.ctx.model.Topic.update(update, { where: { id } });
    if (topic[0] < 1) {
      throw new Error('该主题不存在');
    }

    return topic[0];
  }

  async incrementVisitCount(id) {
    const s = this.app.Sequelize;
    const update = { visit_count: s.literal('`reply_count` + 1') };
    return this.ctx.model.Topic.update(update, { where: { id } });
  }

  async newAndSave(title, content, tab, authorId) {
    return this.ctx.model.Topic.create({
      title,
      content,
      tab,
      author_id: authorId,
    });

  }

  /**
   * 七牛上传
   * @param {Stream} readableStream 流
   * @param {String} key 文件名key
   * @param {Function} callback 回调函数
   */
  qnUpload(readableStream, key) {
    const { accessKey, secretKey, bucket } = this.config.qn_access;

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({ scope: bucket });
    const uploadToken = putPolicy.uploadToken(mac);

    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    return new Promise(function(resolve, reject) {
      formUploader.putStream(uploadToken, key, readableStream, putExtra, function(respErr, respBody, respInfo) {
        if (respErr) {
          reject(respErr);
          return;
        }
        if (respInfo.statusCode === 200) {
          resolve(respBody);
        } else {
          reject(new Error('上传失败:statusCode !== 200'));
        }
      });
    });
  }
}

module.exports = TopicService;
