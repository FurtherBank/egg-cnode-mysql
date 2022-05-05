'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/message.test.js', () => {
  let topicId,
    loginname1,
    loginname2,
    user1,
    user2,
    ctx,
    message,
    messageService;
  before(async function() {
    ctx = app.mockContext();
    messageService = ctx.service.message;
    loginname1 = `loginname1_${Date.now()}`;
    loginname2 = `loginname2_${Date.now()}`;
    user1 = await ctx.service.user.newAndSave('name', loginname1, 'pass', `${loginname1}@test.com`, 'avatar_url', 'active');
    user2 = await ctx.service.user.newAndSave('name', loginname2, 'pass', `${loginname2}@test.com`, 'avatar_url', 'active');
    assert(user1.loginname === loginname1);
    assert(user2.loginname === loginname2);

    const title = 'first post';
    const content = 'hello world';
    const tab = 'share';
    const topic = await ctx.service.topic.newAndSave(title, content, tab, user1.loginname);
    topicId = topic.id;
    assert(topic.title === title);
    assert(topic.content === content);
    assert(topic.tab === tab);
    assert.equal(topic.author_id, user1.loginname);
  });

  it('sendAtMessage should ok', async () => {
    // at
    message = await messageService.sendMessage('at', user2.loginname, user1.loginname, topicId);
    assert(message.type === 'at');
    assert(message.topic_id.toString() === topicId.toString());
    assert(message.author_id === user1.loginname);
    assert.equal(message.master_id.toString(), user2.loginname);
    // reply
    const result = await messageService.sendMessage('reply', user2.loginname, user1.loginname, topicId);
    assert(result.type === 'reply');
    assert(result.topic_id.toString() === topicId.toString());
    assert(result.author_id === user1.loginname);
    assert.equal(result.master_id.toString(), user2.loginname);
    // activate
    const activateMessage = await messageService.sendActivateMessage(user2.loginname);
    assert(activateMessage.type === 'activate');
    assert.equal(activateMessage.master_id.toString(), user2.loginname);
    // invalid
    const invalid = await messageService.sendMessage('at', user2.loginname, 0, user1.loginname);
    assert(invalid === null);
  });


  it('getMessagesCount should ok', async () => {
    const result = await messageService.getMessagesCount(user2.loginname);
    assert(result >= 1);
  });

  it('model.Message should ok', async () => {
    const mockMessage1 = await messageService.sendMessage('at', user2.loginname, user1.loginname, 0);
    assert(mockMessage1.is_invalid);

    message.type = 'at1';
    assert(message.is_invalid === true);
    message.type = 'at';
    assert(message.is_invalid === false);
  });

  it('getMessageById should ok', async () => {
    const result = await messageService.getMessageById(message.id);
    assert(result.id === message.id);
    assert(result.topic.id === message.topic_id);

  });

  it('getReadMessagesByUserId should ok', async () => {
    const result = await messageService.getReadMessagesByUserId(user2.loginname);
    assert(result.length === 0);
  });

  it('getUnreadMessagesByUserId should ok', async () => {
    const result = await messageService.getUnreadMessagesByUserId(user2.loginname);
    assert(result.length >= 1);
  });

  it('updateMessagesToRead should ok', async () => {
    let result = await messageService.updateMessagesToRead(user2.loginname, []);
    assert(result === undefined);

    result = await messageService.updateMessagesToRead(user2.loginname, [ message ]);
    assert(result[0]);
  });

  it('updateOneMessageToRead should ok', async () => {
    let result = await messageService.updateOneMessageToRead();
    assert(result === undefined);
    await message.update({ has_read: false });
    result = await messageService.updateOneMessageToRead(message.id);
    assert(result === 1);
  });
});
