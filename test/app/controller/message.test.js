'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/message.test.js', () => {
  let user1,
    user2,
    topicId;

  before(async function() {
    const ctx = app.mockContext();
    const loginname1 = `loginname1_${Date.now()}`;
    const loginname2 = `loginname2_${Date.now()}`;
    const email1 = `${loginname1}@test.com`;
    const email2 = `${loginname2}@test.com`;
    user1 = await ctx.service.user.newAndSave('name', loginname1, 'pass', email1, 'avatar_url', 'active');
    user2 = await ctx.service.user.newAndSave('name', loginname2, 'pass', email2, 'avatar_url', 'active');
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

  it('should GET /my/messages', async () => {
    const ctx = app.mockContext({
      user: {
        name: user2.name,
        loginname: user2.loginname,
        is_admin: false,
        active: true,
      },
    });

    const message = await ctx.service.message.sendMessage('at', user2.loginname, user1.loginname, topicId);
    let result = await app.httpRequest().get('/my/messages');
    assert(result.status === 200);
    assert(result.text.includes('first post'));

    ctx.service.message.updateOneMessageToRead(message.id);
    result = await app.httpRequest().get('/my/messages');
    assert(result.status === 200);
    assert(result.text.includes('first post'));
  });
});
