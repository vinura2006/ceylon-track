// Tests for Sri Lanka coordinate validation
function isValidSriLankaCoordinate(lat, lng) {
    return lat >= 5.7 && lat <= 9.9 && lng >= 79.5 && lng <= 81.9;
}

describe('GPS Coordinate Validation', () => {
    test('valid Colombo coords',         () => expect(isValidSriLankaCoordinate(6.9, 79.8)).toBe(true));
    test('valid Kandy coords',           () => expect(isValidSriLankaCoordinate(7.29, 80.63)).toBe(true));
    test('rejects latitude too low',     () => expect(isValidSriLankaCoordinate(5.6, 80.0)).toBe(false));
    test('rejects latitude too high',    () => expect(isValidSriLankaCoordinate(10.0, 80.0)).toBe(false));
    test('rejects longitude too low',    () => expect(isValidSriLankaCoordinate(7.0, 79.4)).toBe(false));
    test('rejects longitude too high',   () => expect(isValidSriLankaCoordinate(7.0, 82.0)).toBe(false));
    test('rejects India coordinates',    () => expect(isValidSriLankaCoordinate(12.0, 77.0)).toBe(false));
});
