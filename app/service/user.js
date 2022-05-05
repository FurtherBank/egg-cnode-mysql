'use strict';

const utility = require('utility');
const Service = require('egg').Service;

class UserService extends Service {
  /**
   * 根据用户名列表查找用户列表
   * @param {string[]} names 用户名列表
   * @return {Promise[users]} 承载用户列表的 Promise 对象
   */
  async getUsersByNames(names) {
    if (names.length === 0) {
      return [];
    }
    const s = this.app.Sequelize;
    const { in: opIn } = s.Op; // 解构操作拿到 in 操作符，因为 in 是保留字，需要: 后面加别名
    const query = { loginname: { [opIn]: names } };
    return this.ctx.model.User.findAll({ where: query });
  }

  /**
   * 根据登录名查找用户
   * @param {String} loginName 登录名
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByLoginName(loginName) {
    const query = { loginname: loginName };
    return this.ctx.model.User.findOne({ where: query });
  }

  /**
   * 根据登录名或邮箱查找用户
   * @param {String} loginName 登录名
   * @param {String} email 邮箱
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByLoginNameOrEmail(loginName, email) {
    const s = this.app.Sequelize;
    const { or } = s.Op;
    const query = { [or]: [{ loginname: loginName }, { email }] };
    return this.ctx.model.User.findOne({ where: query });
  }

  /**
   * 根据 githubId 查找用户
   * @param {String} githubId 登录名
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByGithubId(githubId) {
    if (!githubId) return null;
    const query = { githubId };
    return this.ctx.model.User.findOne({ where: query });
  }

  /**
   * 根据 token 查找用户, include All
   * @param {String} token
   * @param accessToken
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByToken(accessToken) {
    if (!accessToken) return null;
    const query = { accessToken };
    return this.ctx.model.User.findOne({ where: query, include: { all: true } });
  }

  /**
   * 根据邮箱，查找用户
   * @param {String} email 邮箱地址
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByMail(email) {
    if (!email) return null;
    return this.ctx.model.User.findOne({ where: { email } });
  }


  /**
   * 根据关键字，获取一组用户
   * Callback:
   * - err, 数据库异常
   * - users, 用户列表
   * @param {object} query 关键字
   * @param {object} opt 选项
   * @return {Promise[users]} 承载用户列表的 Promise 对象
   */
  getUsersByQuery(query, opt) {
    const options = Object.assign({ where: query }, opt);
    return this.ctx.model.User.findAll(options);
  }

  /**
   * 获取关键词能搜索到的用户数量
   * @param {String} query 搜索关键词
   */
  getCountByQuery(query) {
    return this.ctx.model.User.count({ where: query });
  }

  /**
   * 根据查询条件，获取一个用户
   * @param {String} token 用户名
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByAccessToken(token) {
    const query = { accessToken: token };
    return this.ctx.model.User.findOne({ where: query });
  }
  /**
   * 根据查询条件，获取一个用户
   * @param {String} name 用户名
   * @param loginname
   * @param {String} key 激活码
   * @return {Promise[user]} 承载用户的 Promise 对象
   */
  getUserByNameAndKey(loginname = '', key = '') {
    const query = { loginname, retrieve_key: key };
    return this.ctx.model.User.findOne({ where: query });
  }

  async incrementScoreAndReplyCount(loginName, score, replyCount) {
    const s = this.app.Sequelize;
    const update = {
      score: s.literal(`\`score\` + ${score}`),
      reply_count: s.literal(`\`reply_count\` + ${replyCount}`),
    };
    return this.ctx.model.User.update(update, { where: { loginname: loginName } });
  }


  /**
   * 新建用户并保存
   * @param {string} name 用户名
   * @param {string} loginname 登录名(pk)
   * @param {string} pass 密码(已被哈希)
   * @param {string} email 邮箱
   * @param {string} avatar_url 头像 url
   * @param {boolean} active 激活与否
   * @return {Promise<user>}
   */
  async newAndSave(name, loginname, pass, email, avatar_url, active) {
    return this.ctx.model.User.create({
      name: loginname,
      loginname,
      pass,
      email,
      avatar: avatar_url,
      active: !!active,
    });
  }

  makeGravatar(email) {
    return 'http://www.gravatar.com/avatar/' + utility.md5(email.toLowerCase()) + '?size=48';
  }

  getGravatar(user) {
    return user.avatar || this.makeGravatar(user.email);
  }
}

module.exports = UserService;
