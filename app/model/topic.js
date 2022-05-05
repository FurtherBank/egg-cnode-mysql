'use strict';

module.exports = app => {
  const { INTEGER, STRING, DATE, NOW, BOOLEAN } = app.Sequelize;

  const Topic = app.model.define('topic', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: STRING },
    content: { type: STRING(2000) },
    author_id: { type: STRING(30) }, // 作者的loginname,外码通过联系指定
    top: { type: BOOLEAN, defaultValue: false }, // 置顶帖
    good: { type: BOOLEAN, defaultValue: false }, // 精华帖
    lock: { type: BOOLEAN, defaultValue: false }, // 被锁定主题
    reply_count: { type: INTEGER, defaultValue: 0 },
    visit_count: { type: INTEGER, defaultValue: 0 },
    last_reply: { type: INTEGER }, // 最后的 reply 的 id
    last_reply_at: { type: DATE, defaultValue: NOW }, // 最后的 reply 的时间
    content_is_html: { type: BOOLEAN, defaultValue: false }, // 内容是否为 html，这个没有说明大用处
    tab: { type: STRING(30) }, // 话题标签：share 分享, ask 问答, job 招聘
    deleted: { type: BOOLEAN, defaultValue: false },
  }, {
    indexes: [
      {
        fields: [
          'created_at',
        ],
      },
      {
        fields: [
          'top',
          'last_reply_at',
        ],
      },
      {
        fields: [
          'author_id',
          'created_at',
        ],
      },
    ],
  });

  Topic.associate = function() {
    app.model.Topic.belongsTo(app.model.User, {
      as: 'author',
      foreignKey: 'author_id',
    });
    app.model.Topic.belongsToMany(app.model.User, {
      as: 'collectedUsers',
      foreignKey: 'topic_id',
      through: app.model.TopicCollect,
    });
    app.model.Topic.hasMany(app.model.Reply);
    app.model.Topic.hasMany(app.model.Message);
  };

  return Topic;
};
