// Tests for the reliability classification logic
describe('Reliability Classification', () => {
    function classify(percent) {
        if (percent === null) return 'NO_DATA';
        if (percent >= 80) return 'USUALLY_ON_TIME';
        if (percent >= 50) return 'SOMETIMES_DELAYED';
        return 'OFTEN_LATE';
    }

    test('null → NO_DATA',             () => expect(classify(null)).toBe('NO_DATA'));
    test('100% → USUALLY_ON_TIME',     () => expect(classify(100)).toBe('USUALLY_ON_TIME'));
    test('80% → USUALLY_ON_TIME',      () => expect(classify(80)).toBe('USUALLY_ON_TIME'));
    test('79% → SOMETIMES_DELAYED',    () => expect(classify(79)).toBe('SOMETIMES_DELAYED'));
    test('50% → SOMETIMES_DELAYED',    () => expect(classify(50)).toBe('SOMETIMES_DELAYED'));
    test('49% → OFTEN_LATE',           () => expect(classify(49)).toBe('OFTEN_LATE'));
    test('0% → OFTEN_LATE',            () => expect(classify(0)).toBe('OFTEN_LATE'));
});
