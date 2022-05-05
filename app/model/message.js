'use strict';

module.exports = app => {
  const { INTEGER, STRING, BOOLEAN, VIRTUAL } = app.Sequelize;

  const Message = app.model.define('message', {
    type: { type: STRING(30) },
    master_id: { type: STRING(30) }, // 信息拥有者名称
    author_id: { type: STRING(30) }, // @ 你/回复你的那个人的名称
    topic_id: { type: INTEGER }, // 相关话题 id
    reply_id: { type: INTEGER },
    github: { type: STRING }, // github 绑定信息关联的 github 名称
    has_read: { type: BOOLEAN, defaultValue: false },
    is_invalid: {
      type: VIRTUAL,
      get() {
        switch (this.type) {
          case 'reply':
          case 'reply2':
          case 'at':
            return !this.author_id || !this.topic_id;
          case 'bind':
            return !!this.github;
          case 'activate':
            return false;
          default:
            return true;
        }
      },
    },
  }, {
    // 设置索引
    indexes: [
      {
        fields: [
          'master_id',
          'has_read',
          'created_at',
        ],
      },
    ],
  });

  Message.associate = function() {
    app.model.Message.belongsTo(app.model.User, { as: 'master', foreignKey: 'master_id', onDelete: 'cascade' });
    app.model.Message.belongsTo(app.model.User, { as: 'sender', foreignKey: 'author_id' });
    app.model.Message.belongsTo(app.model.Topic, { foreignKey: 'topic_id' });
    app.model.Message.belongsTo(app.model.Reply, { foreignKey: 'reply_id' });
  };

  return Message;
};
