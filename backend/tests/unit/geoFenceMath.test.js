'use strict';

const {
  haversineDistance,
  isInsideCircle,
  isInsidePolygon,
  checkFenceViolation,
  isInsideFence,
} = require('../../src/utils/geoFenceMath');

describe('geoFenceMath', () => {
  it('calculates haversine distance and circle inclusion', () => {
    expect(haversineDistance(31.2304, 121.4737, 31.2304, 121.4737)).toBeCloseTo(0, 5);
    expect(isInsideCircle(31.2304, 121.4737, 31.2304, 121.4737, 5)).toBe(true);
    expect(isInsideCircle(31.2404, 121.4737, 31.2304, 121.4737, 5)).toBe(false);
  });

  it('checks polygon inclusion using ray casting', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
    ];

    expect(isInsidePolygon(5, 5, points)).toBe(true);
    expect(isInsidePolygon(15, 5, points)).toBe(false);
    expect(isInsidePolygon(1, 1, [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toBe(false);
  });

  it('supports fence type aliases in isInsideFence', () => {
    expect(
      isInsideFence(
        { latitude: 5, longitude: 5 },
        { fence_type: 'polygon', points: [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, { lat: 10, lng: 10 }, { lat: 10, lng: 0 }] }
      )
    ).toBe(true);
  });

  it('computes enter/exit violations according to alert type', () => {
    expect(
      checkFenceViolation(
        { latitude: 5, longitude: 5 },
        { fenceType: 'circle', centerLat: 0, centerLng: 0, radius: 1, lastInside: null }
      )
    ).toEqual({ violated: false, alertType: null, isInside: false });

    expect(
      checkFenceViolation(
        { latitude: 0, longitude: 0 },
        { fenceType: 'circle', centerLat: 0, centerLng: 0, radius: 100, lastInside: false, alertType: 'both' }
      )
    ).toEqual({ violated: true, alertType: 'enter', isInside: true });

    expect(
      checkFenceViolation(
        { latitude: 10, longitude: 10 },
        { fenceType: 'circle', centerLat: 0, centerLng: 0, radius: 100, lastInside: true, alertType: 'exit' }
      )
    ).toEqual({ violated: true, alertType: 'exit', isInside: false });

    expect(
      checkFenceViolation(
        { latitude: 10, longitude: 10 },
        { fenceType: 'circle', centerLat: 0, centerLng: 0, radius: 100, lastInside: true, alertType: 'enter' }
      )
    ).toEqual({ violated: false, alertType: null, isInside: false });
  });
});
