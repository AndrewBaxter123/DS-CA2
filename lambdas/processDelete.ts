import { SNSEvent } from "aws-lambda";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

const ddbDocClient = createDDBDocClient();
const sesClient = new SESClient({ region: SES_REGION });

export const handler = async (event: SNSEvent) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.Sns.Message);
    const s3Record = snsMessage.Records[0];
    const objectKey = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, " "));

    const deleteCommand = new DeleteCommand({
      TableName: "Images",
      Key: { ImageName: objectKey },
    });

    try {
      const result = await ddbDocClient.send(deleteCommand);
      console.log(`Successfully deleted item with key: ${objectKey}`, result);
      await sendDeletionEmail(objectKey);
    } catch (error) {
      console.error(`Error processing record: `, error);
      throw error; 
    }
  }
};

function createDDBDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}


async function sendDeletionEmail(objectKey: string) {
  const emailSubject = `Image Deleted: ${objectKey}`;
  const emailBody = `An image with the key ${objectKey} has been deleted from the bucket.`;

  const params: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO], 
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html><body><p>${emailBody}</p></body></html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: emailSubject,
      },
    },
    Source: SES_EMAIL_FROM, 
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log("Deletion notification email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
