'use strict';

const communityOrderService = require('./communityAdmin/communityOrderService');
const communityActivityService = require('./communityAdmin/communityActivityService');
const communityCareOpsService = require('./communityAdmin/communityCareOpsService');

module.exports = {
  ...communityOrderService,
  ...communityActivityService,
  ...communityCareOpsService,
};
