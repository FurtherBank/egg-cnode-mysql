'use strict';

const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/reply.test.js', () => {
  let user,
    lockTopic,
    topic,
    reply,
    uper,
    name;
  const wrongTopicId = '565c4473d0bc14ae279399fe';
  const wrongReplyId = '565c4473d0bc14ae279399fe';
  before(async function() {

    const ctx = app.mockContext();
    name = 'Gea';
    user = await ctx.service.user.newAndSave(
      name,
      name + Date.now(),
      'pass',
      name + Date.now() + '@test.com',
      'avatar_url',
      'active'
    );
    uper = await ctx.service.user.newAndSave(
      'uper',
      'uper' + Date.now(),
      'pass',
      'uper' + Date.now() + '@test.com',
      'avatar_url',
      'active'
    );

    const topic_title = 'test';
    const topic_content = 'unit test';
    const tab = 'share';
    lockTopic = await ctx.service.topic.newAndSave(topic_title, topic_content, tab, user.loginname);
    topic = await ctx.service.topic.newAndSave(topic_title, topic_content, tab, user.loginname);
    lockTopic.lock = true;
    lockTopic = await lockTopic.save();

    const reply_content = 'unit test reply';
    reply = await ctx.service.reply.newAndSave(reply_content, topic.id, user.loginname);
  });

  it('should POST /:topic_id/reply ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/${wrongTopicId}/reply`)
      .send({
        r_content: '',
      })
      .expect(422);
  });

  it('should POST /:topic_id/reply ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/${wrongTopicId}/reply`)
      .send({
        r_content: 'test',
      })
      .expect(404);
  });

  it('should POST /:topic_id/reply ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/${lockTopic.id}/reply`)
      .send({
        r_content: 'test',
      })
      .expect(403);
  });

  it('should POST /:topic_id/reply ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/${topic.id}/reply`)
      .send({
        r_content: 'test',
      })
      .expect(302);
  });

  it('should GET /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .get(`/reply/${wrongReplyId}/edit`)
      .expect(404);
  });

  it('should GET /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: false,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .get(`/reply/${reply.id}/edit`)
      .expect(403);
  });

  it('should GET /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .get(`/reply/${reply.id}/edit`)
      .expect(200);
  });

  it('should POST /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${wrongReplyId}/edit`)
      .send({
        t_content: 'test',
      })
      .expect(404);
  });

  it('should POST /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: false,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/edit`)
      .send({
        t_content: 'test',
      })
      .expect(403);
  });

  it('should POST /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/edit`)
      .send({
        t_content: '',
      })
      .expect(400);
  });

  it('should POST /reply/:reply_id/edit ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/edit`)
      .send({
        t_content: 'test',
      })
      .expect(302);
  });

  it('should POST /reply/:reply_id/delete ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${wrongReplyId}/delete`)
      .send({})
      .expect(422);
  });

  it('should POST /reply/:reply_id/delete ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: true,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/delete`)
      .send({})
      .expect(200)
      .expect(/success/);
  });

  it('should POST /reply/:reply_id/delete ok', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: false,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/delete`)
      .send({})
      .expect(200)
      .expect(/failed/);
  });

  it('POST /reply/:reply_id/up > wrong id should 404', async () => {
    app.mockContext({
      user: {
        name,
        loginname: '565c4473d0bc14ae279399fe',
        is_admin: false,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${wrongReplyId}/up`)
      .send({})
      .expect(404);
  });

  it('POST /reply/:reply_id/up > up self should 呵呵', async () => {
    app.mockContext({
      user: {
        name,
        loginname: user.loginname,
        is_admin: false,
        active: true,
      },
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/up`)
      .send({})
      .expect(200)
      .expect(/呵呵/);
  });

  it('POST /reply/:reply_id/up > up and down ok', async () => {
    app.mockContext({
      user: uper,
    });
    app.mockCsrf();
    await app
      .httpRequest()
      .post(`/reply/${reply.id}/up`)
      .send({})
      .expect(200)
      .expect(/up/);

    await app
      .httpRequest()
      .post(`/reply/${reply.id}/up`)
      .send({})
      .expect(200)
      .expect(/down/);
  });

});
