#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleStack } from '../lib/simple-stack';

const app = new cdk.App();

// Get environment name from context (provided by cdkeph)
const envName = app.node.tryGetContext('env') || 'dev';

// Create the stack with environment-specific name
new SimpleStack(app, `${envName}-SimpleStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stackName: `${envName}-simple-stack`,
  description: `Simple ephemeral stack for environment: ${envName}`,
  tags: {
    Environment: envName,
    ManagedBy: 'cdkeph',
    Application: 'simple-app'
  }
});

app.synth();
