import { RemovalPolicy, Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

import { Queue } from "aws-cdk-lib/aws-sqs";
import { Bucket } from "aws-cdk-lib/aws-s3";

export class HelloCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const queue = new Queue(this, "HelloCdkQueue", {
      visibilityTimeout: Duration.seconds(300),
    });

    const bucket = new Bucket(this, "HelloCdkBucket", {
      versioned: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
