'use strict';

module.exports = app => {
  const { INTEGER, STRING, BOOLEAN } = app.Sequelize;

  const Reply = app.model.define('reply', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    author_id: { type: STRING(30) },
    topic_id: { type: INTEGER },
    reply_id: { type: INTEGER }, // 二级回复挂载的一级回复的 id
    content: { type: STRING(2000) },
    content_is_html: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
  }, {
    indexes: [
      {
        fields: [
          'topic_id',
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

  Reply.associate = function() {
    app.model.Reply.belongsTo(app.model.User, {
      as: 'author', // 在 reply 视角下，另一个模型的别名
      foreignKey: 'author_id',
      onDelete: 'CASCADE',
    });
    app.model.Reply.belongsToMany(app.model.User, {
      as: 'upers', // 在 reply 视角下，这个联系的别名，会将值放在自己字段上
      through: app.model.ReplyUp,
      foreignKey: 'reply_id',
    });
    app.model.Reply.belongsTo(app.model.Reply, {
      as: 'mountedReply',
      foreignKey: 'reply_id',
      onDelete: 'CASCADE',
    }); // 二级回复挂在哪一个回复上
    app.model.Reply.belongsTo(app.model.Topic, {
      foreignKey: 'topic_id',
    });
  };

  return Reply;
};
