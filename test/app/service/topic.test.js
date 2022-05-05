'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/topic.test.js', () => {
  let ctx;
  let topic;
  let topicId;
  let replyId;
  let loginname;
  let email;

  before(async () => {
    ctx = app.mockContext();
    topic = ctx.service.topic;
    loginname = `loginname_${Date.now()}`;
    email = `${loginname}@test.com`;
    const result = await ctx.service.user.newAndSave('name', loginname, 'pass', email, 'avatar_url', 'active');
    loginname = result.loginname;
    assert(result.loginname === loginname);
  });

  it('newAndSave should ok', async () => {
    const title = 'first post';
    const content = 'hello world';
    const tab = 'share';
    const result = await topic.newAndSave(title, content, tab, loginname);
    assert(result.title === title);
    assert(result.content === content);
    assert(result.tab === tab);
    assert.equal(result.author_id, loginname);
    topicId = result.id;
    const reply = await ctx.service.reply.newAndSave('hi', topicId, loginname);
    assert(reply.content === 'hi');
    assert(reply.author_id === loginname);
    assert(reply.topic_id === topicId);
    replyId = reply.id;
  });

  it('updateLastReply should ok', async () => {
    const result1 = await topic.updateLastReply(topicId, replyId);
    assert(result1 > 0);
    const result2 = await topic.updateLastReply();
    assert(!result2);
  });

  it('getTopicById should ok', async () => {
    const result1 = await topic.getTopicById(topicId);
    assert.equal(result1.topic.id.toString(), topicId);
    assert.equal(result1.author.loginname.toString(), loginname);
    assert.equal(result1.last_reply.id.toString(), replyId);
    const result2 = await topic.getTopicById(0);
    assert(result2.topic === null);
    assert(result2.author === null);
    assert(result2.last_reply === null);
  });

  it('getCountByQuery should ok', async () => {
    const query = {
      good: false,
    };
    const result = await topic.getCountByQuery(query);
    assert(result >= 1);
  });

  it('getTopicsByQuery should ok', async () => {
    const query1 = {
      good: false,
    };
    const result1 = await topic.getTopicsByQuery(query1, {});
    assert(result1.length >= 1);

    const query2 = {
      good: true,
    };
    const result2 = await topic.getTopicsByQuery(query2, {});
    assert(result2.length < result1.length);
  });

  it('getLimit5w should ok', async () => {
    const result = await topic.getLimit5w();
    assert(result.length >= 1);
  });

  it('getTopic should ok', async () => {
    const result = await ctx.service.topic.getTopic(topicId);
    assert.equal(result.id, topicId);
    assert.equal(result.author_id.toString(), loginname);
  });

  it('reduceCount should ok', async () => {
    const result1 = await topic.reduceCount(topicId);
    assert(result1 > 0, replyId);
    await ctx.model.Reply.destroy({ where: { id: replyId } });
    const result2 = await topic.reduceCount(topicId);
    assert(result2 > 0);

    let err;
    try {
      await topic.reduceCount();
    } catch (e) {
      err = e;
      assert(e.message === '该主题不存在');
    }
    assert(err);
  });

  it('getFullTopic should ok', async () => {
    const result1 = await topic.getFullTopic(0);
    assert(result1 === null);

    const topic2 = await topic.getFullTopic(topicId);
    assert.equal(topic2.id.toString(), topicId);
    assert(topic2.author.loginname === loginname);

    await ctx.model.Topic.destroy({ where: { id: topicId } });
    const topic3 = await topic.getFullTopic(topicId);
    assert(topic3 === null);
  });

});
