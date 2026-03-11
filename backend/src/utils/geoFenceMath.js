'use strict';

const EARTH_RADIUS_METERS = 6371000;

/**
 * 灏嗚搴﹁浆鎹负寮у害
 * @param {number} degree 瑙掑害
 * @returns {number}
 */
function toRadians(degree) {
  return (degree * Math.PI) / 180;
}

/**
 * Haversine 鍏紡璁＄畻涓ょ偣闂寸悆闈㈣窛绂伙紙绫筹級
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
 * 鍒ゆ柇鐐规槸鍚﹀湪鍦嗗舰鍥存爮鍐?
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
 * 鍒ゆ柇灏勭嚎鏄惁涓庤竟鐩镐氦
 * @param {number} x 鐐圭粡搴?
 * @param {number} y 鐐圭含搴?
 * @param {number} x1 椤剁偣1缁忓害
 * @param {number} y1 椤剁偣1绾害
 * @param {number} x2 椤剁偣2缁忓害
 * @param {number} y2 椤剁偣2绾害
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
 * 灏勭嚎娉曞垽鏂偣鏄惁鍦ㄥ杈瑰舰鍐咃紙濂囨暟娆′氦鐐逛负鍐呴儴锛?
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
 * 缁熶竴鍒ゆ柇浣嶇疆鐐规槸鍚﹀湪鍥存爮鍐呴儴
 * @param {{latitude:number, longitude:number}} location
 * @param {object} fence
 * @returns {boolean}
 */
function isInsideFence(location, fence) {
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  if (fence.fenceType === 'circle' || fence.fence_type === 'circle') {
    const centerLat = fence.centerLat ?? fence.center_lat ?? fence.centerLatitude;
    const centerLng = fence.centerLng ?? fence.center_lng ?? fence.centerLongitude;
    return isInsideCircle(
      lat,
      lng,
      Number(centerLat),
      Number(centerLng),
      Number(fence.radius)
    );
  }

  return isInsidePolygon(lat, lng, fence.points || []);
}

/**
 * 鏍规嵁鏈浣嶇疆涓庝笂娆＄姸鎬佸垽鏂槸鍚﹁Е鍙戝洿鏍忓憡璀?
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

