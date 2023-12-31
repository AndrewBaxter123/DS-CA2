import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dlqTopic = new sns.Topic(this, 'DLQTopic');

    //debug purposes
    new cdk.CfnOutput(this, 'DLQTopicArn', {
      value: dlqTopic.topicArn,
    });


    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    // Integration infrastructure

    //Dead Letter Queue
const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
  receiveMessageWaitTime: cdk.Duration.seconds(10),
});

    const imageProcessQueue = new sqs.Queue(this, "imageProcessQueue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 5
      },
    });

    const mailerQ = new sqs.Queue(this, "mailer-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });





    // Add an SNS topic
    const newImageTopic = new sns.Topic(this, "NewImageTopic", {
      displayName: "New Image topic",
    });

    const imageDeletedTopic = new sns.Topic(this, "ImageDeletedTopic", {
      displayName: "Image Deleted Topic",
    });

    // Change the S3 event notification destination type to SNS
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(newImageTopic)
    );

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED_DELETE,
      new s3n.SnsDestination(imageDeletedTopic)
    );

    

    // tables


const imageTable = new dynamodb.Table(this, 'ImageTable', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  partitionKey: { name: 'ImageName', 
  type: dynamodb.AttributeType.STRING },
  removalPolicy: cdk.RemovalPolicy.DESTROY, 
  tableName: "Images",
});

    // Lambda functions

    const processImageFn = new lambdanode.NodejsFunction(this, "ProcessImageFn", {
  runtime: lambda.Runtime.NODEJS_18_X,
  entry: `${__dirname}/../lambdas/processImage.ts`,
  timeout: cdk.Duration.seconds(15),
  memorySize: 128,
  deadLetterQueue: dlq
});

const processDeleteFn = new lambdanode.NodejsFunction(this, "ProcessDeleteFn", {
  runtime: lambda.Runtime.NODEJS_18_X,
  entry: `${__dirname}/../lambdas/processDelete.ts`, 
  timeout: cdk.Duration.seconds(15),
  memorySize: 128,
});



    const mailerFn = new lambdanode.NodejsFunction(this, "mailer-function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/confirmationMailer.ts`,
    });

    const rejectionMailerFn = new lambdanode.NodejsFunction(this, "rejection-mailer-function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/rejectionMailer.ts`,
    });

    const updateTableFn = new lambdanode.NodejsFunction(this, "UpdateTableFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(15),
      entry: `${__dirname}/../lambdas/updateTable.ts`,  
    });


    // Add a subscriber to the SNS topic
    newImageTopic.addSubscription(new subs.SqsSubscription(imageProcessQueue));
    newImageTopic.addSubscription(new subs.SqsSubscription(mailerQ));
    newImageTopic.addSubscription(new subs.SqsSubscription(dlq));
    newImageTopic.addSubscription(new subs.LambdaSubscription(rejectionMailerFn));
    imageDeletedTopic.addSubscription(new subs.LambdaSubscription(processDeleteFn));

    imageDeletedTopic.addSubscription(new subs.LambdaSubscription(updateTableFn, {
      filterPolicy: {
        comment_type: sns.SubscriptionFilter.stringFilter({
          allowlist: ["Caption"],
        }),
      },
    }));


    // Event triggers

    const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });
    const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    }); 
    const deadLetterMailEventSource = new events.SqsEventSource(dlq, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });

    processImageFn.addEventSource(newImageEventSource);
    mailerFn.addEventSource(newImageMailEventSource);
    rejectionMailerFn.addEventSource(deadLetterMailEventSource);


    // Permissions

    imagesBucket.grantRead(processImageFn);
    imageTable.grantReadWriteData(processImageFn);
    imagesBucket.grantReadWrite(processDeleteFn);
    imageTable.grantWriteData(processDeleteFn);
    imageTable.grantReadWriteData(updateTableFn);




    mailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );

    rejectionMailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
      resources: ['*'],
    }));

    processDeleteFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"], 
      })
    );

    updateTableFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"], 
      })
    );
    
    

    // Output

    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });
    
    new cdk.CfnOutput(this, 'ImageDeletedTopicArn', { //arn:aws doesn't get output so you need to include that in updatecommand too
      value: imageDeletedTopic.topicArn,
    });
  }
}