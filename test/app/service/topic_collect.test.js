'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/topic_collect.test.js', () => {
  let loginname,
    email,
    userId,
    topic,
    user,
    ctx;
  before(async function() {
    ctx = app.mockContext();
    loginname = `loginname_${Date.now()}`;
    email = `${loginname}@test.com`;
    user = await ctx.service.user.newAndSave('name', loginname, 'pass', email, 'avatar_url', 'active');
    assert(user.loginname === loginname);
    userId = user.loginname;
    const title = 'hi';
    const content = 'hello world';
    const tab = 'share';
    topic = await ctx.service.topic.newAndSave(title, content, tab, userId);
    assert(topic.title === title);
    assert(topic.content === content);
    assert(topic.tab === tab);
    assert(topic.author_id === userId);
  });

  it('newAndSave should ok', async () => {
    const [ result ] = await user.addCollectedTopic(topic);
    assert(result.topic_id === topic.id);
    assert(result.author_id === userId);
  });

  it('getTopicCollect should ok', async () => {
    const result = await ctx.service.topicCollect.getTopicCollect(userId, topic.id);
    assert.equal(result.topic_id, topic.id);
    assert.equal(result.author_id, userId);
  });

  it('getTopicCollectsByUserId should ok', async () => {
    const result = await ctx.service.topicCollect.getTopicCollectsByUserId(userId);
    assert(result.length >= 1);
  });

  it('remove should ok', async () => {
    const result = await ctx.service.topicCollect.remove(userId, topic.id);
    assert(result === 1);
  });
});
