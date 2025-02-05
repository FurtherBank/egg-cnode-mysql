'use strict';

module.exports = app => {
  const { INTEGER, STRING } = app.Sequelize;

  const TopicCollect = app.model.define('topic_collect', {
    author_id: { type: STRING(30) },
    topic_id: { type: INTEGER },
  }, {
    indexes: [
      {
        fields: [
          'author_id',
          'topic_id',
        ],
        unique: true,
      },
    ],
  });

  return TopicCollect;
};
