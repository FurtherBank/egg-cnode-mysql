'use strict';
const utility = require('utility');

module.exports = app => {
  const { DATE, INTEGER, STRING, BOOLEAN, UUID, UUIDV4, VIRTUAL } = app.Sequelize;

  const User = app.model.define('User', {
    name: { type: STRING(30) }, // 呢称
    loginname: { type: STRING(30), primaryKey: true }, // 登录用户名，主键
    pass: { type: STRING }, // 密码 hash
    email: { type: STRING }, // 用户邮箱
    url: { type: STRING }, // 用户主页 url
    location: { type: STRING(30) }, // 所在地
    signature: { type: STRING }, // 个性签名
    weibo: { type: STRING }, // 微博信息
    avatar: { type: STRING }, // 头像
    githubId: { type: STRING(30) }, // 8 位数字
    githubUsername: { type: STRING(30) },
    is_block: { type: BOOLEAN, defaultValue: false },

    score: { type: INTEGER, defaultValue: 0 },
    topic_count: { type: INTEGER, defaultValue: 0 },
    reply_count: { type: INTEGER, defaultValue: 0 },
    is_star: { type: BOOLEAN, defaultValue: false }, // 是否明星用户
    active: { type: BOOLEAN, defaultValue: false },

    retrieve_time: { type: DATE }, // 申请重新恢复密码的时间
    retrieve_key: { type: UUID, defaultValue: UUIDV4 }, // 重新恢复密码申请的uuid

    accessToken: { type: UUID, defaultValue: UUIDV4 }, // 访问令牌，可以通过令牌调用api

    // viturals
    avatar_url: {
      type: VIRTUAL,
      get() {
        if (!this.loginname) {
          return '';
        }
        const md5seed = this.email ? this.email.toLowerCase() : this.loginname.toLowerCase();
        let url = this.avatar ||
          'https://gravatar.com/avatar/' +
            utility.md5(md5seed) +
            '?size=48';

        // www.gravatar.com 被墙
        url = url.replace('www.gravatar.com', 'gravatar.com');

        // 让协议自适应 protocol，使用 `//` 开头
        if (url.indexOf('http:') === 0) {
          url = url.slice(5);
        }

        // 如果是 github 的头像，则限制大小
        if (url.indexOf('githubusercontent') !== -1) {
          url += '&s=120';
        }
        return url;
      },
    },
    isAdvanced: {
      type: VIRTUAL,
      get() {
        return this.score > 700 || this.is_star;
      },
    },
  }, {
    // 从这里开始定义索引
    indexes: [
      {
        fields: [
          'loginname',
        ],
        unique: true,
      },
      {
        fields: [
          'email',
        ],
        unique: true,
      },
      {
        fields: [
          'score',
        ],
      },
      {
        fields: [
          'github_id',
        ],
      },
      {
        fields: [
          'access_token',
        ],
      },
    ],
  });

  User.associate = function() {
    app.model.User.hasMany(app.model.Topic, {
      foreignKey: 'author_id',
    });
    app.model.User.belongsToMany(app.model.Topic, {
      as: 'collectedTopics',
      foreignKey: 'author_id',
      through: app.model.TopicCollect,
    });
    app.model.User.hasMany(app.model.Reply, {
      foreignKey: 'author_id',
      onDelete: 'CASCADE',
    });
    app.model.User.belongsToMany(app.model.Reply, {
      foreignKey: 'author_id',
      as: 'upedReplies',
      through: app.model.ReplyUp,
    });
    app.model.User.hasMany(app.model.Message, {
      foreignKey: 'master_id',
      as: 'messages',
    });
    app.model.User.hasMany(app.model.Message, {
      foreignKey: 'author_id',
      as: 'relatedMessages',
    });
  };

  return User;
};
