'use strict';

const uuid = require('uuid');

module.exports = app => {
  if (app.config.debug) {
    app.config.coreMiddleware.unshift('less');
  }

  if (app.config.env === 'local' || app.config.env === 'unittest') {
    app.beforeStart(async () => {
      await app.model.sync({ force: true });
    });
  }

  const localHandler = async (ctx, { username, password }) => {
    const getUser = username => {
      if (username.indexOf('@') > 0) {
        return ctx.service.user.getUserByMail(username);
      }
      return ctx.service.user.getUserByLoginName(username);
    };
    const existUser = await getUser(username);

    // 用户不存在
    if (!existUser) {
      return null;
    }

    const passhash = existUser.pass;
    // TODO: change to async compare
    const equal = ctx.helper.bcompare(password, passhash);
    // 密码不匹配
    if (!equal) {
      return null;
    }

    // 用户未激活
    // if (!existUser.active) {
    //   // 发送激活邮件
    //   return null;
    // }

    // 验证通过
    return existUser;
  };

  const githubHandler = async (ctx, { profile }) => {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    ctx.logger.info(email, profile);
    let [ existUser, existRelatedUser ] = await Promise.all([
      ctx.service.user.getUserByGithubId(profile.id),
      ctx.service.user.getUserByLoginNameOrEmail(profile.username, email),
    ]);

    if (!existUser) {
      if (!existRelatedUser) {
        // 用户不存在则创建
        existUser = ctx.model.User.build({
          githubId: profile.id,
        });
        existUser.githubId = profile.id;
        existUser.accessToken = uuid.v4();
      } else {
        // 存在但尚未进行 github 认证，认证上
        existUser = existRelatedUser;
        await ctx.service.message.sendBindMessage(existUser.loginname);
      }
    }

    // 用户存在，更新字段
    existUser.active = true;
    existUser.loginname = profile.username;
    existUser.email = email || existUser.email;
    existUser.avatar = profile._json.avatar_url;
    existUser.githubUsername = profile.username;
    existUser.githubAccessToken = profile.accessToken;

    try {
      await existUser.save();
    } catch (ex) {
      // if (ex.message.indexOf('duplicate key error') !== -1) {
      //   let err;
      //   if (ex.message.indexOf('email') !== -1) {
      //     err = new Error('您 GitHub 账号的 Email 与之前在 CNodejs 注册的 Email 重复了');
      //     err.code = 'duplicate_email';
      //     throw err;
      //   }

      //   if (ex.message.indexOf('loginname') !== -1) {
      //     err = new Error('您 GitHub 账号的用户名与之前在 CNodejs 注册的用户名重复了');
      //     err.code = 'duplicate_loginname';
      //     throw err;
      //   }
      // }
      throw ex;
    }

    return existUser;
  };

  app.passport.verify(async (ctx, user) => {
    ctx.logger.debug('鉴权.verify', user);
    const handler = user.provider === 'github' ? githubHandler : localHandler;
    const existUser = await handler(ctx, user);
    if (existUser) {
      // id存入Cookie, 用于验证过期.
      const auth_token = existUser.accessToken + '$$$$'; // 以后可能会存储更多信息，用 $$$$ 来分隔
      const opts = {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
        signed: true,
        httpOnly: true,
      };
      ctx.cookies.set(app.config.auth_cookie_name, auth_token, opts); // cookie 有效期30天
      if (!user.active) ctx.redirect('/resend_activate');
    }

    return existUser;
  });

  app.passport.serializeUser(async (ctx, user) => {
    ctx.logger.debug('鉴权.serialize', user);
    return user;
  });

  app.passport.deserializeUser(async (ctx, user) => {
    ctx.logger.debug('鉴权.deserialize', user);
    if (user) {

      // 提供 auth_token 可以通过 api 爬取信息
      const auth_token = ctx.cookies.get(ctx.app.config.auth_cookie_name, {
        signed: true,
      });

      if (!auth_token) {
        return user;
      }

      const auth = auth_token.split('$$$$');
      const user_token = auth[0];
      user = await ctx.service.user.getUserByAccessToken(user_token);

      if (!user) {
        return user;
      }

      if (ctx.app.config.admins.hasOwnProperty(user.loginname)) {
        user.is_admin = true;
      }
    }

    return user;
  });
};
