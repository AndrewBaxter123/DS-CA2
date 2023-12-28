/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
// import { sharp } from "/opt/nodejs/sharp-utils";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SNS } from "@aws-sdk/client-sns";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

const s3 = new S3Client();
const dynamodb = new DynamoDB({ region: SES_REGION });
const sns = new SNS({ region: SES_REGION });
const dlqTopicArn = process.env.DLQ_TOPIC_ARN;
const tableName = 'Images'; 


export const handler: SQSHandler = async (event) => {
  console.log("Event ", event);
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    console.log('Raw SNS message ',JSON.stringify(recordBody))
    if (recordBody.Records) {
      for (const messageRecord of recordBody.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        // Infer the image type from the file suffix.
        const typeMatch = srcKey.match(/\.([^.]*)$/);
        if (!typeMatch) {
          console.log("Could not determine the image type.");
          throw new Error("Could not determine the image type. ");
        }
        // Check that the image type is supported
        const imageType = typeMatch[1].toLowerCase();
        if (imageType !== "jpeg" && imageType !== "png") {
          console.log(`Unsupported image type: ${imageType}`);
          await sns.publish({
            TopicArn: dlqTopicArn,
            Message: `Unsupported image type: ${imageType} for file ${srcKey}`,
          });
          return;
        }
        // write to DynamoDB if supported correctly
        const dbParams = {
          TableName: tableName,
          Item: {
            ImageName: { S: srcKey },
            Timestamp: { S: new Date().toISOString() },
            ImageType: { S: imageType },
            Status: { S: "Processed" },
            S3Bucket: { S: srcBucket },
            S3Key: { S: srcKey },
          },
        };
        await dynamodb.putItem(dbParams);
      }
    }
  }
};