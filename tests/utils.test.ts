import { generateHash, generateEnvName } from '../src/utils';

describe('ハッシュ生成', () => {
  test('文字列から7桁のハッシュを生成', () => {
    const hash = generateHash('feature/user-auth');
    expect(hash).toHaveLength(7);
    expect(hash).toMatch(/^[a-f0-9]{7}$/);
  });

  test('同じ入力から一貫したハッシュを生成', () => {
    const hash1 = generateHash('feature/user-auth');
    const hash2 = generateHash('feature/user-auth');
    expect(hash1).toBe(hash2);
  });

  test('異なる入力から異なるハッシュを生成', () => {
    const hash1 = generateHash('feature/user-auth');
    const hash2 = generateHash('feature/payment');
    expect(hash1).not.toBe(hash2);
  });
});

describe('環境名生成', () => {
  test('デフォルトプリフィックスとハッシュで環境名を生成', () => {
    const envName = generateEnvName('feature/user-auth');
    expect(envName).toMatch(/^eph-[a-f0-9]{7}$/);
  });

  test('カスタムプリフィックスで環境名を生成', () => {
    const envName = generateEnvName('feature/user-auth', 'test');
    expect(envName).toMatch(/^test-[a-f0-9]{7}$/);
  });

  test('カスタムハッシュで環境名を生成', () => {
    const envName = generateEnvName('feature/user-auth', 'eph', 'abc1234');
    expect(envName).toBe('eph-abc1234');
  });

  test('同じブランチから一貫した環境名を生成', () => {
    const envName1 = generateEnvName('feature/user-auth');
    const envName2 = generateEnvName('feature/user-auth');
    expect(envName1).toBe(envName2);
  });

  test('異なるブランチから異なる環境名を生成', () => {
    const envName1 = generateEnvName('feature/user-auth');
    const envName2 = generateEnvName('feature/payment');
    expect(envName1).not.toBe(envName2);
  });

  test('特殊文字を含むブランチ名を処理', () => {
    const envName = generateEnvName('bugfix/fix-#123_test');
    expect(envName).toMatch(/^eph-[a-f0-9]{7}$/);
  });

  test('ブランチ名の長さに関わらず環境名は短い', () => {
    const longBranch = 'a'.repeat(100);
    const envName = generateEnvName(longBranch);
    expect(envName.length).toBe(11); // 'eph-' + 7 chars
  });

  test('カスタムプリフィックスとカスタムハッシュで環境名を生成', () => {
    const envName = generateEnvName('any-branch', 'dev', 'xyz7890');
    expect(envName).toBe('dev-xyz7890');
  });
});
