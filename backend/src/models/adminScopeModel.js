'use strict';

const { query } = require('../config/database');

async function findCommunityAdminScopeByUserId(userId) {
  const [rows] = await query(
    `SELECT id, user_id, community_id, role
     FROM community_admins
     WHERE user_id = ?
       AND role IN ('admin', 'leader')
     ORDER BY id ASC
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  const admin = rows[0];
  return {
    adminId: Number(admin.id),
    userId: Number(admin.user_id),
    communityId: Number(admin.community_id),
    role: admin.role,
    isGlobalAdmin: false,
  };
}

async function findVolunteerScopeByUserId(userId) {
  const [rows] = await query(
    `SELECT ca.id, ca.user_id, ca.community_id, ca.role, u.name, u.phone
     FROM community_admins ca
     INNER JOIN users u ON u.id = ca.user_id
     WHERE ca.user_id = ?
       AND ca.role = 'volunteer'
     ORDER BY ca.id ASC
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  const volunteer = rows[0];
  return {
    communityAdminId: Number(volunteer.id),
    userId: Number(volunteer.user_id),
    communityId: Number(volunteer.community_id),
    role: volunteer.role,
    name: volunteer.name,
    phone: volunteer.phone,
  };
}

module.exports = {
  findCommunityAdminScopeByUserId,
  findVolunteerScopeByUserId,
};
