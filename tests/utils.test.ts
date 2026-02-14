import { sanitizeBranchName, generateEnvName } from '../src/utils';

describe('Branch Name Sanitization', () => {
  test('sanitizes branch with slashes', () => {
    expect(sanitizeBranchName('feature/user-auth')).toBe('feature-user-auth');
  });

  test('sanitizes branch with special characters', () => {
    expect(sanitizeBranchName('bugfix/fix-#123')).toBe('bugfix-fix-123');
  });

  test('sanitizes branch with underscores', () => {
    expect(sanitizeBranchName('dev/test_feature')).toBe('dev-test-feature');
  });

  test('sanitizes branch with dots', () => {
    expect(sanitizeBranchName('release/v1.0.0')).toBe('release-v1-0-0');
  });

  test('converts to lowercase', () => {
    expect(sanitizeBranchName('Feature/UserAuth')).toBe('feature-userauth');
  });

  test('removes leading hyphens', () => {
    expect(sanitizeBranchName('-feature-branch')).toBe('feature-branch');
  });

  test('removes trailing hyphens', () => {
    expect(sanitizeBranchName('feature-branch-')).toBe('feature-branch');
  });

  test('collapses multiple hyphens', () => {
    expect(sanitizeBranchName('feature--user---auth')).toBe('feature-user-auth');
  });

  test('handles main branch', () => {
    expect(sanitizeBranchName('main')).toBe('main');
  });

  test('handles very long branch names', () => {
    const longBranch = 'a'.repeat(100);
    const sanitized = sanitizeBranchName(longBranch);
    expect(sanitized.length).toBeLessThanOrEqual(50);
  });
});

describe('Environment Name Generation', () => {
  test('generates env name with eph prefix', () => {
    expect(generateEnvName('feature/user-auth')).toBe('eph-feature-user-auth');
  });

  test('generates env name for main branch', () => {
    expect(generateEnvName('main')).toBe('eph-main');
  });

  test('generates env name for complex branch', () => {
    expect(generateEnvName('bugfix/issue-#456_test')).toBe('eph-bugfix-issue-456-test');
  });
});
