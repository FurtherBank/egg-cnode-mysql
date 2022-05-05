'use strict';

const Controller = require('egg').Controller;
const _ = require('lodash');

const MongoObjectIdSchema = {
  type: 'number',
  max: 2147483647,
  min: 0,
};

class CollectController extends Controller {
  async index() {
    const { ctx, service } = this;
    const s = ctx.app.Sequelize;
    const { in: opIn } = s.Op;
    const name = ctx.params.name;

    const user = await service.user.getUserByLoginName(name);

    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error_msg: '用户不存在',
      };
      return;
    }

    const opt = { skip: 0, limit: 100 };

    const collects = await service.topicCollect.getTopicCollectsByUserId(user.loginname, opt);
    const ids = collects.map(doc => {
      return doc.topic_id.toString();
    });

    const query = { id: { [opIn]: ids } };
    let topics = await service.topic.getTopicsByQuery(query, {});

    topics = _.sortBy(topics, topic => {
      return ids.indexOf(topic.id.toString());
    });

    topics = topics.map(topic => {
      topic.author = _.pick(topic.author, [ 'loginname', 'avatar_url' ]);
      return _.pick(topic, [ 'id', 'author_id', 'tab', 'content', 'title', 'last_reply_at',
        'good', 'top', 'reply_count', 'visit_count', 'createdAt', 'author' ]);
    });

    ctx.body = {
      success: true,
      data: topics,
    };
  }

  async collect() {
    const { ctx, service } = this;
    const topic_id = ctx.request.body.topic_id;
    const user = ctx.request.user; // #!!!

    ctx.validate({
      topic_id: MongoObjectIdSchema,
    }, ctx.request.body);

    const topic = await service.topic.getTopic(topic_id);

    if (!topic) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error_msg: '话题不存在',
      };
      return;
    }

    const collected = await user.hasTopic(topic);

    if (collected) {
      ctx.body = {
        success: false,
        error_msg: '已经收藏过该主题',
      };
      return;
    }

    await user.addTopic(topic);

    ctx.body = { success: true };
  }

  async de_collect() {
    const { ctx, service } = this;
    const topic_id = ctx.request.body.topic_id;
    const user_id = ctx.request.user.loginname; // #!!!

    ctx.validate({
      topic_id: MongoObjectIdSchema,
    }, ctx.request.body);

    const topic = await service.topic.getTopic(topic_id);

    if (!topic) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error_msg: '话题不存在',
      };
      return;
    }

    const removeResult = await service.topicCollect.remove(
      user_id,
      topic.id
    );

    if (removeResult.n === 0) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error_msg: '取消收藏失败',
      };
      return;
    }

    const user = await service.user.getUserByLoginName(user_id);

    await user.save();


    ctx.body = { success: true };
  }
}

module.exports = CollectController;
