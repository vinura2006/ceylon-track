const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Token Hashing', () => {
    test('same input → same hash',       () => expect(hashToken('abc')).toBe(hashToken('abc')));
    test('different inputs → diff hash', () => expect(hashToken('abc')).not.toBe(hashToken('xyz')));
    test('returns hex string',           () => expect(hashToken('test')).toMatch(/^[0-9a-f]{64}$/));
});
