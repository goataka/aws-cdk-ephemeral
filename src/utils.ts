import * as crypto from 'crypto';

export async function getCurrentBranch(): Promise<string> {
  const { execa } = await import('execa');
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = stdout.trim();
    
    if (branch === 'main' || branch === 'master') {
      throw new Error('Cannot deploy ephemeral environment from main/master branch. Please use a feature branch.');
    }
    
    return branch;
  } catch (error) {
    if (error instanceof Error && error.message.includes('main/master branch')) {
      throw error;
    }
    throw new Error('Failed to get current Git branch. Make sure you are in a Git repository.');
  }
}

export function generateHash(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return hash.substring(0, 7);
}

export function generateEnvName(branchName: string, prefix: string = 'eph', customHash?: string): string {
  const hash = customHash || generateHash(branchName);
  return `${prefix}-${hash}`;
}
