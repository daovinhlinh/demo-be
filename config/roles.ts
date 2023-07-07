const AccessControl = require('accesscontrol');

const ac = new AccessControl();

const roles = () => {
   ac.grant('user')
      .readOwn('profile')
      .updateOwn('profile');

   ac.grant('lecturer')
      .extend('user')
      .readOwn('class')
      .updateOwn('class');

   ac.grant('admin')
      .extend('lecturer')
      .readAny('profile')
      .updateAny('profile')
      .deleteAny('profile')
      .readAny('class')
      .updateAny('class')
      .deleteAny('class')
      .createAny('class')
      ;
};

roles()

export default ac