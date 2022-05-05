mongo admin -u ${MONGO_INITDB_ROOT_USERNAME} -p ${MONGO_INITDB_ROOT_PASSWORD} << EOF
  # 切换到 测试数据库，并创建用户
  use ${MONGO_INITDB_DATABASE}_test
  db.createUser({ user: '${MONGO_INITDB_DATABASE}_test', pwd: '${MONGO_INITDB_DATABASE}_test', roles: [{ role: 'readWrite',db: '${MONGO_INITDB_DATABASE}_test' }] })
  db.${MONGO_INITDB_DATABASE}.insert({ ${MONGO_INITDB_DATABASE}: 'egg-cnode' })
  # 切换到 开发数据库，并创建用户
  use ${MONGO_INITDB_DATABASE}
  db.createUser({ user: '${MONGO_INITDB_DATABASE}', pwd: '${MONGO_INITDB_DATABASE}', roles: [{ role: 'readWrite', db: '${MONGO_INITDB_DATABASE}' }] })
  db.${MONGO_INITDB_DATABASE}.insert({ ${MONGO_INITDB_DATABASE}: 'egg-cnode' })
EOF