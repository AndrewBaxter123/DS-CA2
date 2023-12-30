import { S3Handler } from "aws-lambda";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDBDocClient();

export const handler: S3Handler = async (event) => {
  console.log("Event: ", event);

  for (const record of event.Records) {
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    try {
      const deleteCommand = new DeleteCommand({
        TableName: "Images",
        Key: { ImageName: objectKey },    // Your DynamoDB table's key attribute
      });

      await ddbDocClient.send(deleteCommand);
      console.log(`Successfully deleted item with key: ${objectKey}`);
    } catch (error) {
      console.error(`Error deleting item with key: ${objectKey}: `, error);
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
