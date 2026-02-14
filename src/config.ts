import * as fs from 'fs';
import * as path from 'path';

export interface EphemeralConfig {
  ttlHours?: number;
  defaultRegion?: string;
  permissionBoundaryArn?: string;
  cdkExecutionRoleArn?: string;
  deploymentRoleArn?: string;
  schedulerRoleArn?: string;
}

export interface CdkJsonConfig {
  app?: string;
  context?: Record<string, any>;
  ephemeral?: EphemeralConfig;
}

/**
 * Loads configuration from cdk.json
 */
export function loadConfig(configPath?: string): CdkJsonConfig {
  const cdkJsonPath = configPath || path.join(process.cwd(), 'cdk.json');
  
  if (!fs.existsSync(cdkJsonPath)) {
    throw new Error(`cdk.json not found at ${cdkJsonPath}. Please create one or run from your CDK project directory.`);
  }
  
  const content = fs.readFileSync(cdkJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Gets the TTL in hours from config, defaults to 24 hours
 */
export function getTTL(config: CdkJsonConfig): number {
  return config.ephemeral?.ttlHours || 24;
}

/**
 * Gets the AWS region from config or environment
 */
export function getRegion(config: CdkJsonConfig): string {
  return config.ephemeral?.defaultRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
}
