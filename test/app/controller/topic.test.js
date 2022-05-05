'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const path = require('path');

function randomInt() {
  return (Math.random() * 10000).toFixed(0);
}

describe('test/app/controller/topic.test.js', () => {
  const objectId = '565c4473d0bc14ae279399fe';
  let ctx,
    key,
    username,
    user,
    mockUser,
    fakeUser,
    topic;

  before(async () => {
    ctx = app.mockContext();
    username = 'xiaomuzhu';
    key = new Date().getTime() + '_' + randomInt();
    user = await ctx.service.user.newAndSave(
      username,
      username + key,
      'pass',
      username + key + '@test.com',
      'avatar_url',
      'active'
    );
    fakeUser = await ctx.service.user.newAndSave(
      'cnode',
      'cnode' + key,
      'pass',
      'cnode' + key + '@test.com',
      'avatar_url',
      'active'
    );

    topic = await user.createTopic({
      title: 'title',
      content: 'content',
      tab: 'share',
    });

    mockUser = (user, isAdmin = false) => {
      user.is_admin = isAdmin;
      app.mockContext({ user });
      app.mockCsrf();
    };

    await user.addCollectedTopic(topic);

    await ctx.service.reply.newAndSave('hi', topic.id, user.loginname);
  });

  it('should GET /topic/:tid ok', async () => {
    await app.httpRequest().get(`/topic/${topic.id}`).expect(200);
    await app.httpRequest().get('/topic/123').expect(404);
    mockUser(user);
    ctx.service.cache.setex('no_reply_topics', null, 60);
    await app.httpRequest().get(`/topic/${topic.id}`).expect(200);
  });

  it('should GET /topic/create ok', async () => {
    mockUser(user);
    await app.httpRequest().get('/topic/create').expect(200);
  });

  it('should GET /topic/:tid/edit ok', async () => {
    mockUser(fakeUser);
    await app.httpRequest().get(`/topic/${topic.id}/edit`).expect(403);
    mockUser(user);
    await app.httpRequest().get(`/topic/${objectId}/edit`).expect(404);
    await app.httpRequest().get(`/topic/${topic.id}/edit`).expect(200);
  });

  it('should POST /topic/create forbidden', async () => {
    app.mockCsrf();
    await app.httpRequest().post('/topic/create').expect(403);
  });

  it('should POST /topic/create forbidden', async () => {
    mockUser(user);
    app.mockCsrf();
    await app.httpRequest().post('/topic/create')
      .send({
        invalid_field: 'not make sense',
      })
      .expect(422);
  });

  it('should POST /topic/create ok', async () => {
    mockUser(user);
    app.mockCsrf();
    await app.httpRequest().post('/topic/create')
      .send({
        tab: 'share',
        title: 'topic测试标题',
        content: 'topic test topic content',
      })
      .expect(302);
  });

  it('should POST /topic/create per day limit works', async () => {
    mockUser(user);
    app.mockCsrf();
    for (let i = 0; i < 9; i++) {
      await app.httpRequest().post('/topic/create')
        .send({
          tab: 'share',
          title: `topic测试标题${i + 1}`,
          content: 'topic test topic content',
        })
        .expect(302);
    }
    await app.httpRequest().post('/topic/create')
      .send({
        tab: 'share',
        title: 'topic测试标题11',
        content: 'topic test topic content',
      })
      .expect(403);
  });

  it('should POST /topic/:tid/top ok', async () => {
    mockUser(user);
    const res = await app.httpRequest().post(`/topic/${topic.id}/top`);
    assert(res.text.includes('需要管理员权限。'));
    mockUser(user, true);
    await app.httpRequest().post(`/topic/${objectId}/top`).expect(404);
    await app.httpRequest().post(`/topic/${topic.id}/top`).expect(200);
  });

  it('should POST /topic/:tid/good ok', async () => {
    mockUser(user);
    const res = await app.httpRequest().post(`/topic/${topic.id}/good`);
    assert(res.text.includes('需要管理员权限。'));
    mockUser(user, true);
    await app.httpRequest().post(`/topic/${objectId}/good`).expect(404);
    await app.httpRequest().post(`/topic/${topic.id}/good`).expect(200);
  });

  it('should POST /topic/:tid/lock ok', async () => {
    mockUser(user);
    const res = await app.httpRequest().post(`/topic/${topic.id}/lock`);
    assert(res.text.includes('需要管理员权限。'));
    mockUser(user, true);
    await app.httpRequest().post(`/topic/${objectId}/lock`).expect(404);
    await app.httpRequest().post(`/topic/${topic.id}/lock`).expect(200);
  });

  it('should POST /topic/:tid/edit ok', async () => {
    const body = {
      title: '',
      tab: '',
      content: '',
    };

    mockUser(fakeUser);
    await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body)
      .expect(403);

    mockUser(user);
    await app
      .httpRequest()
      .post(`/topic/${objectId}/edit`)
      .send(body)
      .expect(404);

    const r1 = await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body);
    assert(r1.text.includes('标题不能是空的。'));

    body.title = 'hi';
    const r2 = await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body);
    assert(r2.text.includes('标题字数太多或太少。'));

    body.title = '这是一个大标题';
    const r4 = await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body);
    assert(r4.text.includes('必须选择一个版块。'));

    body.tab = 'share';
    const r3 = await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body);
    assert(r3.text.includes('内容不可为空。'));

    body.content = 'hi';
    await app
      .httpRequest()
      .post(`/topic/${topic.id}/edit`)
      .send(body)
      .expect(302);
  });

  it('should POST /topic/collect ok', async () => {
    mockUser(user);
    const result1 = await app
      .httpRequest()
      .post('/topic/collect')
      .send({
        topic_id: 0,
      });

    assert(JSON.parse(result1.text).status === 'failed');

    await app
      .httpRequest()
      .post('/topic/collect')
      .send({
        topic_id: topic.id,
      })
      .expect(200);

    const result2 = await app
      .httpRequest()
      .post('/topic/collect')
      .send({
        topic_id: topic.id,
      });

    assert(JSON.parse(result2.text).status === 'failed');
  });

  it('should POST /topic/de_collect ok', async () => {
    mockUser(fakeUser);
    const result1 = await app
      .httpRequest()
      .post('/topic/de_collect')
      .send({
        topic_id: topic.id,
      });
    assert(JSON.parse(result1.text).status === 'failed');

    mockUser(user);
    const result2 = await app
      .httpRequest()
      .post('/topic/de_collect')
      .send({
        topic_id: 0,
      });
    assert(JSON.parse(result2.text).status === 'failed');

    await app
      .httpRequest()
      .post('/topic/de_collect')
      .send({
        topic_id: topic.id,
      })
      .expect(200);
  });

  it('should POST /topic/:tid/delete ok', async () => {
    mockUser(fakeUser);
    await app.httpRequest().post(`/topic/${topic.id}/delete`).expect(403);
    mockUser(user);
    await app.httpRequest().post(`/topic/${topic.id}/delete`).expect(200);
    await app.httpRequest().post(`/topic/${objectId}/delete`).expect(422);
  });

  it('should POST /upload > ok with user access', async () => {
    app.mockCsrf();
    const file = path.resolve(__dirname, '../../../app/public/images/logo.png');
    await app
      .httpRequest()
      .post('/upload')
      .attach('logo', file)
      .expect(403);
    console.log('403 ok');
    mockUser(user);
    await app
      .httpRequest()
      .post('/upload')
      .attach('logo', file)
      .expect(200);
  });

});
