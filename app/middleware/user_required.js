'use strict';

module.exports = () => {

  /*
   * 需要登录
   */
  return async function(ctx, next) {
    if (!ctx.user || !ctx.user.loginname) {
      ctx.status = 403;
      ctx.body = 'forbidden!';
      return;
    }
    await next();
  };
};
