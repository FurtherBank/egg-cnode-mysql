'use strict';

const _ = require('lodash');
const utility = require('utility');
const validator = require('validator');
const Controller = require('egg').Controller;

class UserController extends Controller {
  async index() {
    const { ctx, service, config } = this;
    const s = ctx.app.Sequelize;
    const { in: opIn } = s.Op;
    const user_name = ctx.params.name || '';
    const user = await service.user.getUserByLoginName(user_name);
    if (!user) {
      ctx.status = 404;
      ctx.message = '这个用户不存在。';
      return;
    }

    let query = { author_id: user.loginname };
    const [ recent_topics, replies ] = await Promise.all([
      service.topic.getTopicsByQuery(query, { limit: 5, order: [[ 'createdAt', 'DESC' ]] }),
      service.reply.getRepliesByAuthorId(user.loginname, { limit: 20, order: [[ 'createdAt', 'DESC' ]] }),
    ]);

    // 只显示最近5条
    const topic_ids = [ ...new Set(replies.map(reply => reply.topic_id.toString())) ].slice(0, 5);

    query = { id: { [opIn]: topic_ids } };
    let recent_replies = await service.topic.getTopicsByQuery(query, {});

    recent_replies = _.sortBy(recent_replies, topic => {
      return topic_ids.indexOf(topic.id.toString());
    });

    user.collect_topic_count = await user.countCollectedTopics();
    user.url = (() => {
      if (user.url && user.url.indexOf('http') !== 0) {
        return 'http://' + user.url;
      }
      return user.url;
    })();

    // 如果用户没有激活，那么管理员可以帮忙激活
    let token = '';
    if (!user.active && ctx.user && ctx.user.is_admin) {
      token = utility.md5(user.email + user.pass + config.session_secret);
    }

    await ctx.render('user/index', {
      user,
      recent_topics,
      recent_replies,
      token,
      pageTitle: `@${user.loginname} 的个人主页`,
    });
  }

  async listStars() {
    const { ctx, service } = this;
    const stars = await service.user.getUsersByQuery({ is_star: true }, {});
    await ctx.render('user/stars', { stars });
  }

  async top100() {
    const { ctx, service } = this;
    const opt = { limit: 100, order: [[ 'score', 'DESC' ]] };
    const tops = await service.user.getUsersByQuery({ is_block: false }, opt);
    await ctx.render('user/top100', {
      users: tops,
      pageTitle: 'top100',
    });
  }

  async listCollectedTopics() {
    const { ctx, service } = this;
    const name = ctx.params.name;
    const page = Number(ctx.query.page) || 1;
    const limit = this.config.list_topic_count;
    const s = ctx.app.Sequelize;
    const { in: opIn } = s.Op;

    const user = await service.user.getUserByLoginName(name);

    if (!user) {
      ctx.status = 404;
      ctx.message = '这个用户不存在。';
      return;
    }

    const collectCount = await user.countCollectedTopics();
    const pages = Math.ceil(collectCount / limit);
    const opt = { skip: (page - 1) * limit, limit };

    const collects = await service.topicCollect.getTopicCollectsByUserId(user.loginname, opt);
    const ids = collects.map(doc => {
      return doc.topic_id;
    });

    const query = { id: { [opIn]: ids } };
    let topics = await service.topic.getTopicsByQuery(query, {});
    topics = _.sortBy(topics, topic => {
      return ids.indexOf(topic.id);
    });

    await ctx.render('user/collect_topics', {
      topics,
      current_page: page,
      pages,
      user,
    });
  }

  async listTopics() {
    const { ctx, service, config } = this;
    const user_name = ctx.params.name;
    const page = Number(ctx.query.page) || 1;
    const limit = config.list_topic_count;

    const user = await service.user.getUserByLoginName(user_name);

    if (!user) {
      ctx.status = 404;
      ctx.message = '这个用户不存在。';
      return;
    }

    const query = { author_id: user.loginname };
    const opt = { skip: (page - 1) * limit, limit, order: [[ 'createdAt', 'DESC' ]] };
    const [ topics, all_topics_count ] = await Promise.all([
      service.topic.getTopicsByQuery(query, opt),
      service.topic.getCountByQuery(query),
    ]);
    const pages = Math.ceil(all_topics_count / limit);

    await ctx.render('user/topics', {
      user,
      topics,
      current_page: page,
      pages,
    });
  }

  async listReplies() {
    const { ctx, service } = this;
    const user_name = ctx.params.name;
    const page = Number(ctx.query.page) || 1;
    const limit = 50;
    const s = ctx.app.Sequelize;
    const { in: opIn } = s.Op;

    const user = await service.user.getUserByLoginName(user_name);
    if (!user) {
      ctx.status = 404;
      ctx.message = '这个用户不存在。';
      return;
    }

    const opt = { skip: (page - 1) * limit, limit, order: [[ 'createdAt', 'DESC' ]] };
    const replies = await service.reply.getRepliesByAuthorId(user.loginname, opt);
    const topic_ids = [
      ...new Set(
        replies.map(reply => {
          return reply.topic_id.toString();
        })
      ),
    ];
    // 获取所有有评论的主题
    const query = { id: { [opIn]: topic_ids } };
    let topics = await service.topic.getTopicsByQuery(query, {});
    topics = _.sortBy(topics, topic => {
      return topic_ids.indexOf(topic.id.toString());
    });
    const count = await service.reply.getCountByAuthorId(user.loginname);
    const pages = Math.ceil(count / limit);

    await ctx.render('user/replies', {
      user,
      topics,
      current_page: page,
      pages,
    });
  }

  async showSetting() {
    const { ctx, service } = this;
    const id = ctx.user.loginname;
    const user = await service.user.getUserByLoginName(id);

    if (ctx.request.query.save === 'success') {
      user.success = '保存成功。';
    }

    return ctx.render('user/setting', { user, pageTitle: '设置' });
  }

  async setting() {
    const { ctx, service } = this;
    // 显示出错或成功信息
    async function showMessage(msg, data, isSuccess) {
      data = data || ctx.request.body;
      const user = {
        loginname: data.loginname,
        email: data.email,
        url: data.url,
        location: data.location,
        signature: data.signature,
        weibo: data.weibo,
        accessToken: data.accessToken,
      };

      if (isSuccess) {
        user.success = msg;
      } else {
        user.error = msg;
      }

      return ctx.render('user/setting', { user });
    }

    // post
    const { body } = ctx.request;
    const action = body.action;
    if (action === 'change_setting') {
      const url = validator.trim(body.url);
      const location = validator.trim(body.location);
      const weibo = validator.trim(body.weibo);
      const signature = validator.trim(body.signature);

      const user = await service.user.getUserByLoginName(ctx.user.loginname);
      user.url = url;
      user.location = location;
      user.signature = signature;
      user.weibo = weibo;
      await user.save();
      return ctx.redirect('/setting?save=success');
    }

    if (action === 'change_password') {
      const oldPass = validator.trim(body.old_pass);
      const newPass = validator.trim(body.new_pass);
      if (!oldPass || !newPass) {
        return showMessage('旧密码或新密码不得为空');
      }

      const user = await service.user.getUserByLoginName(ctx.user.loginname);
      const equal = ctx.helper.bcompare(oldPass, user.pass);
      if (!equal) {
        return showMessage('当前密码不正确。', user);
      }

      const newPassHash = ctx.helper.bhash(newPass);
      user.pass = newPassHash;
      await user.save();
      return showMessage('密码已被修改。', user, true);
    }
  }

  async toggleStar() {
    const { ctx, service } = this;
    const user_id = ctx.request.body.user_id;

    const user = await service.user.getUserByLoginName(user_id);
    user.is_star = !user.is_star;
    await user.save();
    ctx.body = { status: 'success' };
    return;
  }

  async block() {
    const { ctx, service } = this;
    const action = ctx.request.body.action;
    const loginname = ctx.params.name;
    const user = await service.user.getUserByLoginName(loginname);

    if (action === 'set_block') {
      user.is_block = true;
      await user.save();
      ctx.body = { status: 'success' };
    } else if (action === 'cancel_block') {
      user.is_block = false;
      await user.save();
      ctx.body = { status: 'success' };
    }
  }

  async deleteAll() {
    const { ctx, service } = this;
    const loginname = ctx.params.name;
    const user = await service.user.getUserByLoginName(loginname);

    // 删除主题
    await ctx.model.Topic.update({ deleted: true }, { where: { author_id: user.loginname } });
    // 删除评论
    await ctx.model.Reply.update({ deleted: true }, { where: { author_id: user.loginname } });
    // 点赞数也全部干掉
    await ctx.model.ReplyUp.destroy({ where: { author_id: user.loginname } });
    ctx.body = { status: 'success' };
  }
}

module.exports = UserController;
