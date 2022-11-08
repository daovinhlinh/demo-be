const AccessControl = require('accesscontrol');

const ac = new AccessControl();

const roles = () => {
   ac.grant('user')
      .readOwn('profile')
      .updateOwn('profile');

   ac.grant('admin')
      .extend('user')
      .readAny('profile');
};

roles()

export default ac