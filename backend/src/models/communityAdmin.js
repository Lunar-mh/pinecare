'use strict';

module.exports = {
  ...require('./communityAdmin/volunteers'),
  ...require('./communityAdmin/orders'),
  ...require('./communityAdmin/activities'),
  ...require('./communityAdmin/stats'),
};
