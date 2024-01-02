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


+ aws s3 cp ./images/sunflower.jpeg  s3://bucketname/image1.jpeg
+ aws sns publish --topic-arn "ARN" --message-attributes file://attributes.json --message file://message.json
+ s3api delete-object --bucket bucketname --key image1.jpeg



