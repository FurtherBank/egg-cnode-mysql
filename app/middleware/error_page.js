'use strict';

const status = [ 404, 403 ];

module.exports = () => {
  return async function errorPage(ctx, next) {
    await next();
    if ((status.indexOf(ctx.status) > -1) && !ctx.body) {
      const { message } = ctx;
      const status = ctx.status;
      ctx.status = status;
      if (ctx.acceptJSON) {
        ctx.body = { error: 'Not Found' };
      } else {
        await ctx.render('notify/notify', { error: message });
      }
    }
  };
};
