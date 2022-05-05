'use strict';

module.exports = app => {
  const { INTEGER, STRING } = app.Sequelize;

  const ReplyUp = app.model.define('reply_up', {
    reply_id: { type: INTEGER },
    author_id: { type: STRING(30) },
  }, {
    indexes: [
      {
        fields: [
          'reply_id',
          'author_id',
        ],
        unique: true,
      },
    ],
  });

  return ReplyUp;
};
