# README #



### What is this repository for? ###

Okta currently doesn't support push notification for the System Log 2.0. This app uses AWS Lambda, SNS and serverless framework to poll the Logs api and send notification to SNS which the users can subscribe to as needed.

### How do I get set up? ###

npm install serverless -g

npm install

### Files ###
    config.json - where the config setting are stored as json object
         url  - url is the Okta Base Url
         pollTimeinMinutes - how often you often you want to poll in minutes lowest is 1 minute.
         schedulerRate - how often you often you want to poll in minutes lowest is 1 minute used by CloudWatch Events
    secret.json - where the secret setting are stored as json. ! Don't commit to git.
        token - Okta Read Only API Token generated from Okta.
    handler.js -  where the Lamda code exists.

### Deploy to AWS ###

    * setup config.json and secret.json file.
    * set AWS credentials, region in serverless.yml.

serverless deploy test


### Contribution guidelines ###

* Writing tests - TBD
* Code review - TBD

### Who do I talk to? ###

serverless docs - [https://github.com/serverless/serverless]
