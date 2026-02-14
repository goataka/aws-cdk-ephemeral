import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class SimpleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get environment name from context
    const envName = this.node.tryGetContext('env') || 'dev';

    // Create an S3 bucket for this ephemeral environment
    const bucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: `${envName}-data-bucket-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
      description: 'Name of the S3 bucket',
      exportName: `${envName}-bucket-name`,
    });

    // Output the environment name for verification
    new cdk.CfnOutput(this, 'Environment', {
      value: envName,
      description: 'Environment name',
    });
  }
}
