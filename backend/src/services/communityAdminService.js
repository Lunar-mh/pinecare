'use strict';

const communityOrderService = require('./communityAdmin/communityOrderService');
const communityCareOpsService = require('./communityAdmin/communityCareOpsService');

module.exports = {
  ...communityOrderService,
  ...communityCareOpsService,
};
