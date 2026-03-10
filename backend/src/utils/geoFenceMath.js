'use strict';

const EARTH_RADIUS_METERS = 6371000;

/**
 * 将角度转换为弧度
 * @param {number} degree 角度
 * @returns {number}
 */
function toRadians(degree) {
  return (degree * Math.PI) / 180;
}

/**
 * Haversine 公式计算两点间球面距离（米）
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * 判断点是否在圆形围栏内
 * @param {number} lat
 * @param {number} lng
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusMeters
 * @returns {boolean}
 */
function isInsideCircle(lat, lng, centerLat, centerLng, radiusMeters) {
  const distance = haversineDistance(lat, lng, centerLat, centerLng);
  return distance <= radiusMeters;
}

/**
 * 判断射线是否与边相交
 * @param {number} x 点经度
 * @param {number} y 点纬度
 * @param {number} x1 顶点1经度
 * @param {number} y1 顶点1纬度
 * @param {number} x2 顶点2经度
 * @param {number} y2 顶点2纬度
 * @returns {boolean}
 */
function isRayIntersectSegment(x, y, x1, y1, x2, y2) {
  const intersectsY = (y1 > y) !== (y2 > y);
  if (!intersectsY) {
    return false;
  }

  const intersectX = ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
  return intersectX > x;
}

/**
 * 射线法判断点是否在多边形内（奇数次交点为内部）
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{lat:number,lng:number}>} points
 * @returns {boolean}
 */
function isInsidePolygon(lat, lng, points) {
  if (!Array.isArray(points) || points.length < 3) {
    return false;
  }

  let intersections = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    if (
      isRayIntersectSegment(
        lng,
        lat,
        Number(current.lng),
        Number(current.lat),
        Number(next.lng),
        Number(next.lat)
      )
    ) {
      intersections += 1;
    }
  }

  return intersections % 2 === 1;
}

/**
 * 统一判断位置点是否在围栏内部
 * @param {{latitude:number, longitude:number}} location
 * @param {object} fence
 * @returns {boolean}
 */
function isInsideFence(location, fence) {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  if (fence.fenceType === 'circle' || fence.fence_type === 'circle') {
    return isInsideCircle(
      lat,
      lng,
      Number(fence.centerLat || fence.center_lat),
      Number(fence.centerLng || fence.center_lng),
      Number(fence.radius)
    );
  }

  return isInsidePolygon(lat, lng, fence.points || []);
}

/**
 * 根据本次位置与上次状态判断是否触发围栏告警
 * @param {{latitude:number, longitude:number}} location
 * @param {object} fence
 * @returns {{violated:boolean, alertType:'enter'|'exit'|null, isInside:boolean}}
 */
function checkFenceViolation(location, fence) {
  const isInside = isInsideFence(location, fence);
  const previousInside = typeof fence.lastInside === 'boolean' ? fence.lastInside : null;

  if (previousInside === null) {
    return { violated: false, alertType: null, isInside };
  }

  let alertType = null;
  if (!previousInside && isInside) {
    alertType = 'enter';
  } else if (previousInside && !isInside) {
    alertType = 'exit';
  }

  if (!alertType) {
    return { violated: false, alertType: null, isInside };
  }

  const targetType = fence.alertType || fence.alert_type || 'both';
  const violated = targetType === 'both' || targetType === alertType;

  return {
    violated,
    alertType: violated ? alertType : null,
    isInside,
  };
}

module.exports = {
  haversineDistance,
  isInsideCircle,
  isInsidePolygon,
  checkFenceViolation,
  isInsideFence,
};
