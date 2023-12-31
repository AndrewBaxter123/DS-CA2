import { SNSEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sesClient = new SESClient({ region: SES_REGION });

export const handler = async (event: SNSEvent) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        const snsMessage = JSON.parse(record.Sns.Message);
        const { name, description } = snsMessage;

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
            await sendUpdateEmail(name, description);
        } catch (error) {
            console.error(`Error updating item with key: ${name}: `, error);
            throw error;
        }
    }
};

async function sendUpdateEmail(name: string, description: string) {
    const emailSubject = `Image Updated: ${name}`;
    const emailBody = `Description for image ${name} has been updated to: ${description}`;

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
        console.log("Update notification email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}
