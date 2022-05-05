'use strict';

const Controller = require('egg').Controller;

const MongoObjectIdSchema = {
  type: 'string',
  format: /^[0-9]+$/i,
  max: 10,
};

class ReplyController extends Controller {
  async create() {
    const { ctx } = this;
    ctx.validate({
      topic_id: MongoObjectIdSchema,
    }, ctx.params);

    const topicId = ctx.params.topic_id;
    const content = (ctx.request.body.content || '').trim();
    const replyId = ctx.request.body.reply_id || null;

    if (content === '') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error_msg: '回复内容不能为空',
      };
      return;
    }

    const { topic, author } = await ctx.service.topic.getTopicById(topicId);

    if (!topic) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error_msg: '话题不存在',
      };
      return;
    }

    if (topic.lock) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        error_msg: '该话题已被锁定',
      };
      return;
    }

    const reply = await ctx.service.reply.newAndSave(content, topicId, ctx.request.user.loginname, replyId);
    await ctx.service.topic.updateLastReply(topicId, reply.id);
    // 发送 at 消息，并防止重复 at 作者
    const newContent = content.replace('@' + author.loginname + ' ', '');
    await ctx.service.at.sendMessageToMentionUsers(newContent, topicId, ctx.request.user.loginname, reply.id);

    const user = await ctx.service.user.getUserByLoginName(ctx.request.user.loginname);
    user.score += 5;
    user.reply_count += 1;
    await user.save();

    if (topic.author_id.toString() !== ctx.request.user.loginname.toString()) {
      await ctx.service.message.sendMessage('reply', topic.author_id, ctx.request.user.loginname, topic.id, reply.id);
    }

    ctx.body = {
      success: true,
      reply_id: reply.id,
    };
  }

  async updateUps() {
    const { ctx } = this;
    ctx.validate({
      reply_id: MongoObjectIdSchema,
    }, ctx.params);

    const replyId = parseInt(ctx.params.reply_id);
    const userId = ctx.request.user.loginname;

    if (!replyId) {
      ctx.status = 422;
      ctx.body = { success: false, error_msg: '提供了错误的 id' };
      return;
    }

    const reply = await ctx.service.reply.getReply(replyId);

    if (!reply) {
      ctx.status = 404;
      ctx.body = { success: false, error_msg: '评论不存在' };
      return;
    }

    if (reply.author_id === userId) {
      ctx.status = 403;
      ctx.body = { success: false, error_msg: '不能帮自己点赞' };
      return;
    }

    let action = '';
    const hasUped = reply.upers.find(uper => uper.loginname === userId);

    if (hasUped === undefined) {
      await reply.addUper(ctx.request.user);
      action = 'up';
    } else {
      await reply.removeUper(ctx.request.user);
      action = 'down';
    }

    ctx.body = {
      action,
      success: true,
    };
  }
}

module.exports = ReplyController;
