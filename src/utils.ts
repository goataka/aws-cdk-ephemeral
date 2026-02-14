/**
 * Sanitizes a branch name to be used as part of AWS resource names
 * Converts all symbols to hyphens
 */
export function sanitizeBranchName(branchName: string): string {
  // Replace all non-alphanumeric characters with hyphens
  let sanitized = branchName.replace(/[^a-zA-Z0-9]/g, '-');
  
  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');
  
  // Replace multiple consecutive hyphens with a single hyphen
  sanitized = sanitized.replace(/-+/g, '-');
  
  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();
  
  // Limit length to avoid AWS naming constraints
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  return sanitized;
}

/**
 * Gets the current Git branch name
 */
export async function getCurrentBranch(): Promise<string> {
  const { execa } = await import('execa');
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim();
  } catch (error) {
    throw new Error('Failed to get current Git branch. Make sure you are in a Git repository.');
  }
}

/**
 * Generates environment name from branch name
 */
export function generateEnvName(branchName: string): string {
  const sanitized = sanitizeBranchName(branchName);
  return `eph-${sanitized}`;
}
