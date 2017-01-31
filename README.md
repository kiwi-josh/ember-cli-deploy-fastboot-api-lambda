# ember-cli-deploy-fastboot-api-lambda

An ambitious ember-cli-deploy plugin for serving Ember FastBoot Applications entirely from within AWS Lambda/API Gateway (assets and all!).

## Background
API Gateway [now supports the handling binary payloads](https://aws.amazon.com/about-aws/whats-new/2016/11/binary-data-now-supported-by-api-gateway/), which means an end-to-end fastboot hosting solution can now be achieved through API gateway and Lambda without the use of S3 for serving static files. This is what this addon aims to achieve.

## Prerequisites 
- You have [ember-fastboot](https://ember-fastboot.com) installed and configured within your Ember app.
- You have an [AWS account](https://aws.amazon.com/free) setup.
- You have the [AWS CLI](https://aws.amazon.com/cli) installed and configured.

## Installation

* Install the ember-cli-deploy addons
```
ember install ember-cli-deploy
ember install ember-cli-deploy-build
ember install ember-cli-deploy-fastboot-api-lambda
```

## Configuration

* Configure the deployment variables
```
// config/deploy.js
ENV['fastboot-api-lambda'] = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,

  lambdaFunction: 'my-ember-app', // Lambda functions name
  region: 'us-east-1' // Region where lambda is deployed
};
```

* Create the lambda function
		
	* Open the [AWS Lambda console](https://console.aws.amazon.com/lambda). 
	* Select the region that you defined in your deploy variables above.
	* Create a blank lambda, with the name you defined in your deploy variables above.
		* Handler => `index.handler`.
		* Role => `Create a custom role`. Give it a name and use the default policy document.
		* Memory => `128`.
		* Timeout => `30 seconds`.
	* Select `Next` and then select `Create function`. 

* Create the API Gateway Proxy
	
	* Open the [AWS API Gateway console](https://console.aws.amazon.com/apigateway). 
	* Select the region that you defined in your deploy variables above.
	* Select `New API` and give it a name
	* Select Binary Support. Click `Edit`. Add `*/*` and click `Save`.
	* Create proxy method:
		* Under resources, click `/`, then click `Actions => Create Method`. Select `Any`.
		* Click the `Any label`, choose Integration type `lambda`, check the `Use Lambda Proxy integration` checkbox, and finally select your lambda function's region and name.
	* Create proxy resource:
		* Under resources, click `/`, then click `Actions => Create Resource`. Select `Any`.
		* Select `Configure as proxy resource`, and select `Enable API Gateway CORS`.
		* Select Integration type `Lambda Function Proxy`, and finally select your lambda function's region and name.
	* Under resources, click `Actions => Deploy API`. Select a new stage and give it the name `fastboot`. Hit `Deploy`. You will now see the `Invoke URL`. This is where you site will be hosted.

* Ember Application
	* The `rootURL` must match the stage name you selected when creating the api gateway. Otherwise the `link-to` helper wont work.
	```
	// config/environment.js
	var ENV = {
		rootURL: '/fastboot/'
  }
	```

* Configuration is done! 🎉

## Deployment

Is as simple as going:

`ember deploy production --activate --verbose=true`


## Caveats

Just a word of warning.. just because this architecture is possible, doesn't make it the optimal for all use-cases.
Lambda functions suffer from a cold start delay, which can make there response times unpredictable.


## Sites using this addon

* [nzsupps.co.nz](https://nzsupps.co.nz)

*Feel free to make a pull request if you would like your site added to the list!*



## Credit
[ember-cli-deploy-fastboot-lambda](https://github.com/bustlelabs/ember-cli-deploy-fastboot-lambda) for providing the base upload logic.

## Information
For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).

For more information on using ember-cli-deploy, visit [https://github.com/ember-cli-deploy/ember-cli-deploy](https://github.com/ember-cli-deploy/ember-cli-deploy).