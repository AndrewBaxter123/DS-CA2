import { S3Handler, SNSEvent } from "aws-lambda";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDBDocClient();

export const handler = async (event: SNSEvent) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
  
    for (const record of event.Records) {
      try {

        const snsMessage = JSON.parse(record.Sns.Message);
        const s3Record = snsMessage.Records[0];
        const objectKey = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, " "));

        
        const deleteCommand = new DeleteCommand({
            TableName: "Images",
            Key: { ImageName: objectKey },
        });

        const result = await ddbDocClient.send(deleteCommand);
        console.log(`Successfully deleted item with key: ${objectKey}`, result);
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
