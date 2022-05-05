'use strict';

const Controller = require('egg').Controller;

class MessageController extends Controller {
  async index() {
    const { ctx } = this;
    const userId = ctx.user.loginname;
    const msgService = ctx.service.message;
    const [ readMessages, unReadMessages ] = await Promise.all([
      msgService.getReadMessagesByUserId(userId),
      msgService.getUnreadMessagesByUserId(userId),
    ]);

    // 把未读消息全部设置成已读
    await msgService.updateMessagesToRead(userId, unReadMessages);
    await ctx.render('message/index.html', {
      has_read_messages: readMessages,
      hasnot_read_messages: unReadMessages,
    });
  }
}

module.exports = MessageController;
