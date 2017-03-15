'use strict';

const DEFAULT_REGION   = 'us-west-2';

const DeployPlugin     = require('ember-cli-deploy-plugin');
const fs               = require('fs-promise');
const path             = require('path');
const AWS              = require('aws-sdk');
const RSVP             = require('rsvp');
const exec             = RSVP.denodeify(require('child_process').exec);

module.exports = DeployPlugin.extend({
  requiredConfig: ['lambdaFunction'],

  _getConfig(context) {
    const config = Object.assign({}, context.config['fastboot-api-lambda']);
    return config;
  },

  _getSafeConfig(context) {
    const config = this._getConfig(context);
    delete config.accessKeyId;
    delete config.secretAccessKey;
    return config;
  },

  _getPaths(context) {
    const addonRootPath = path.join(__dirname, '..');
    const projectRootPath = context.project.root;

    const skeletonPath = path.join(addonRootPath, 'assets/lambda-package');
    const tempPath = path.join(projectRootPath, 'tmp/lambda-package');

    return {
      addonRootPath,
      projectRootPath,
      skeletonPath,
      tempPath
    };
  },

  didBuild: function(context) {
    const config = this._getSafeConfig(context);
    const paths = this._getPaths(context);

    const addonRootPath = paths.addonRootPath;
    const projectRootPath = paths.projectRootPath
    const skeletonPath = paths.skeletonPath;
    const tempPath = paths.tempPath;

    return RSVP.resolve()
    .then(() => this.log(`1/6. Cleaning up any existing temp files`))
    .then(() => fs.remove(tempPath))
    .then(() => fs.remove(`${tempPath}.zip`))
    
    .then(() => this.log(`2/6. Cloning skeleton FastBoot server`))
    .then(() => fs.copy(skeletonPath, tempPath))
    
    .then(() => this.log(`3/6. Installing FastBoot server dependencies`))
    .then(() => exec("npm install --production", { cwd: tempPath }))

    .then(() => this.log(`4/6. Cloning config into FastBoot server directory`))
    .then(() => {
      const json = JSON.stringify(config);
      return fs.writeFile(`${tempPath}/config.json`, json, 'utf8');
    })
    
    .then(() => this.log(`5/6. Cloning FastBoot build into FastBoot server directory`))
    .then(() => fs.copy(context.distDir, `${tempPath}/dist`))
    
    .then(() => this.log(`6/6. Installing dependencies of the FastBoot build`))
    .then(() => exec('npm install --production', { cwd: `${tempPath}/dist` }))
    
    .then(() => this.log(`API FastBoot lambda production bundle successfully built`));
  },

  activate: function(context) {
    const tempPath = this._getPaths(context).tempPath;
    const config = this._getConfig(context);

    const lambdaFunction = config.lambdaFunction;

    const lambdaConfig = {
      region: config.region || DEFAULT_REGION
    };

    if (config.accessKeyId) {
      lambdaConfig.accessKeyId = config.accessKeyId;
    }

    if (config.secretAccessKey) {
      lambdaConfig.secretAccessKey = config.secretAccessKey;
    }

    const Lambda = new AWS.Lambda(lambdaConfig);
    const UpdateLambdaFunc = RSVP.denodeify(Lambda.updateFunctionCode.bind(Lambda));

    return RSVP.resolve()
    .then(() => this.log('1/3. zipping up API FastBoot lambda bundle'))
    .then(() => exec("zip -qr lambda-package.zip *", { cwd: tempPath }))
    .then(() => exec("mv lambda-package.zip ../", { cwd: tempPath }))

    .then(() => this.log('2/3. Reading zip file into file buffer'))
    .then(() => fs.readFile(`${tempPath}.zip`))

    .then(fileBuf => {
      this.log(`3/3. Uploading zip to ${lambdaFunction} lambda to ${lambdaConfig.region} region`);
      return UpdateLambdaFunc({
        FunctionName: lambdaFunction,
        ZipFile: fileBuf
      });
    })

    .then(() => this.log(`API FastBoot lambda production bundle successfully uploaded to "${lambdaFunction}" lambda in region "${lambdaConfig.region}" 🚀`));
  }
});
