## EDA Assignment - Distributed Systems.

__Name:__ Andrew Baxter

__Student Number:__ 20092531

__YouTube Demo link__ - ToDo

### Phase 1.

[ List the Lambda functions in this phase's architecture and state their working status.]

+ Confirmation Mailer - Fully implemented.
+ Rejection Mailer - Majority implemented but with email bug.
+ Process Image - Fully Implemented

### Phase 2 (if relevant).

+ Confirmation Mailer - Fully implemented.
+ Rejection Mailer - Majority implemented but with email bug.
+ Process Image - Fully implemented.
+ Process Delete - Fully implemented and extra added email functionality.
+ Update Table - Fully implemented and extra added email functionality.

### Phase 3 (if relevant).

+ Confirmation Mailer - Fully implemented.
+ Rejection Mailer - Majority implemented but with email bug.
+ Process Image - Fully implemented
+ Process Delete - Fully implemented

### commands to test.

test 1
aws s3 cp ./images/sunflower.jpeg  s3://edastack-images9bf4dcd5-scpnrktlnc8t/image1.jpeg
show email
aws sns publish --topic-arn "arn:aws:sns:eu-west-1:986377014912:EDAStack-ImageDeletedTopic894C24F6-uKpl7FXFOrly" --message-attributes file://attributes.json --message file://message.json
show dynamodb with updated caption
show email
s3api delete-object --bucket edastack-images9bf4dcd5-scpnrktlnc8t --key image1.jpeg
show dynamodb table to show its gone
show email

aws s3 cp ./images/test.gif  s3://edastack-images9bf4dcd5-scpnrktlnc8t/imageGIF.gif
show email 
show dynamo to show its not being uploaded there



