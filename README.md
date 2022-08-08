# Serverless

## serverless.yml
 - On the *serverless.yml* file you should put your *org*
 - By default the Serverless Framework creates a S3 Bucket, if you want to set your own Bucket for the deployments, please set the Bucket name on: *provider.deploymentBucket.name*

## Deploy
You will need to have the *serverless* command installed:
```
$ npm install -g serverless
```
Remember to have the node modules installed:
```
$ npm install
```
Deploy the App with the command:
```
$ serverless deploy
```

## Config
Once you deploy your project, you will have to go to write the next data on the *config/.config* file, you will find it on AWS:
 - The AWS API Gateway Endpoint
```
ENDPOINT=LINK_OBTAINED_FROM_THE_AWS_WEB_SOCKET_API_GATEWAY
```

# S3 Static Page
To upload the client use the command:
```
$ serverless s3sync
```
