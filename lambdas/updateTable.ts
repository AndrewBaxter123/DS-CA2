import { SNSEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: SNSEvent) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const { name, description } = message;

    const updateCommand = new UpdateCommand({
      TableName: "Images",
      Key: { ImageName: name },
      UpdateExpression: "set description = :desc",
      ExpressionAttributeValues: {
        ":desc": description,
      },
    });

    try {
      const result = await ddbDocClient.send(updateCommand);
      console.log(`Successfully updated item with key: ${name}`, result);
    } catch (error) {
      console.error(`Error updating item with key: ${name}: `, error);
      throw error;
    }
  }
};
