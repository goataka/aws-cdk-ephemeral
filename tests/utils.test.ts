import { generateHash, generateEnvName } from '../src/utils';

describe('Hash Generation', () => {
  test('generates 7-digit hash from string', () => {
    const hash = generateHash('feature/user-auth');
    expect(hash).toHaveLength(7);
    expect(hash).toMatch(/^[a-f0-9]{7}$/);
  });

  test('generates consistent hash for same input', () => {
    const hash1 = generateHash('feature/user-auth');
    const hash2 = generateHash('feature/user-auth');
    expect(hash1).toBe(hash2);
  });

  test('generates different hashes for different inputs', () => {
    const hash1 = generateHash('feature/user-auth');
    const hash2 = generateHash('feature/payment');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Environment Name Generation', () => {
  test('generates env name with eph prefix and hash', () => {
    const envName = generateEnvName('feature/user-auth');
    expect(envName).toMatch(/^eph-[a-f0-9]{7}$/);
  });

  test('generates consistent env name for same branch', () => {
    const envName1 = generateEnvName('feature/user-auth');
    const envName2 = generateEnvName('feature/user-auth');
    expect(envName1).toBe(envName2);
  });

  test('generates different env names for different branches', () => {
    const envName1 = generateEnvName('feature/user-auth');
    const envName2 = generateEnvName('feature/payment');
    expect(envName1).not.toBe(envName2);
  });

  test('handles special characters in branch names', () => {
    const envName = generateEnvName('bugfix/fix-#123_test');
    expect(envName).toMatch(/^eph-[a-f0-9]{7}$/);
  });

  test('env name is always short regardless of branch length', () => {
    const longBranch = 'a'.repeat(100);
    const envName = generateEnvName(longBranch);
    expect(envName.length).toBe(11); // 'eph-' + 7 chars
  });
});
