'use strict';

const Controller = require('egg').Controller;

class MessageController extends Controller {
  async count() {
    const { ctx } = this;
    const userId = ctx.request.user.loginname;
    const count = await ctx.service.message.getMessagesCount(userId);
    ctx.body = { count };
  }

  async markAll() {
    const { ctx } = this;
    const userId = ctx.request.user.loginname;
    const messages = await ctx.service.message.getUnreadMessagesByUserId(userId);
    const result = await ctx.service.message.updateMessagesToRead(userId, messages);
    ctx.body = {
      success: true,
      marked_msgs: result ? messages.map(message => { return { id: message.id }; }) : [],
    };
  }

  async markOne() {
    const { ctx } = this;
    const messageId = ctx.params.msg_id;
    await ctx.service.message.updateOneMessageToRead(messageId);

    ctx.body = {
      success: true,
      marked_msg_id: messageId,
    };
  }

  async list() {
    const { ctx } = this;
    const userId = ctx.request.user.loginname;
    const msgService = ctx.service.message;
    const mdrender = ctx.request.query.mdrender !== 'false';

    // Use ES6 `deconstructor` to analyse the read/unread messages
    const [ readMessages, unreadMessages ] = await Promise.all([
      msgService.getReadMessagesByUserId(userId),
      msgService.getUnreadMessagesByUserId(userId),
    ]);

    const formatMessage = message => {
      return {
        id: message.id,
        type: message.type,
        has_read: message.has_read,
        createdAt: message.createdAt,
        author: {
          loginname: message.sender.loginname,
          avatar_url: message.sender.avatar_url,
        },
        topic: {
          id: message.topic.id,
          title: message.topic.title,
          last_reply_at: message.topic.last_reply_at,
        },
        reply: message.reply ? {
          content: mdrender ? ctx.helper.markdown(message.reply.content) : message.reply.content,
        } : {},
      };
    };

    const hasReadMessages = readMessages.map(message => formatMessage(message));
    const hasUnReadMessages = unreadMessages.map(message => formatMessage(message));

    ctx.body = {
      success: true,
      data: {
        has_read_messages: hasReadMessages,
        hasnot_read_messages: hasUnReadMessages,
      },
    };
  }
}

module.exports = MessageController;
