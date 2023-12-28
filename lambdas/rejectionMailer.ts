import { SQSHandler } from "aws-lambda";
import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

const sesClient = new SESClient({ region: SES_REGION });

export const handler: SQSHandler = async (event) => {
  console.log("Event ", event);
  for (const record of event.Records) {
    const messageBody = record.body;
    console.log("Message received from DLQ: ", messageBody);

    const emailSubject = "Rejected Image Upload";
    const emailBodyHtml = `
      <html>
        <body>
          <h1>Image Rejection Notice</h1>
          <p>The following image was rejected due to an unsupported file type:</p>
          <p>${messageBody}</p>
        </body>
      </html> 
    `;
    
    const params: SendEmailCommandInput = {
      Source: SES_EMAIL_FROM,
      Destination: { ToAddresses: [SES_EMAIL_TO] },
      Message: {
        Subject: { Data: emailSubject, Charset: "UTF-8" },
        Body: {
          Html: { Data: emailBodyHtml, Charset: "UTF-8" },
        },
      },
    };

    try {
      // Send the email using the SES client
      const command = new SendEmailCommand(params);
      const response = await sesClient.send(command);
      console.log("Email sent, message ID: ", response.MessageId);
    } catch (error) {
      console.error("Error sending email: ", error);
      throw error; // throw the error to be logged in CloudWatch, check errors to fix
    }
  }
};
