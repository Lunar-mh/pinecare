'use strict';

const { query } = require('../config/database');
const { fail } = require('../utils/response');

async function volunteerAuth(req, res, next) {
  try {
    if (!req.user) {
      return fail(res, 401, 'Unauthorized.', null, 401);
    }

    const userId = Number(req.user.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 401, 'Unauthorized.', null, 401);
    }

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
      return fail(res, 403, 'Forbidden.', null, 403);
    }

    const volunteer = rows[0];
    req.volunteerScope = {
      communityAdminId: Number(volunteer.id),
      userId: Number(volunteer.user_id),
      communityId: Number(volunteer.community_id),
      role: volunteer.role,
      name: volunteer.name,
      phone: volunteer.phone,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = volunteerAuth;
