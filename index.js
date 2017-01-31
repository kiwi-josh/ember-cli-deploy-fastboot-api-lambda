/* jshint node: true */
'use strict';

var FastbootAPILambdaDeployPlugin = require('./lib/fastboot-api-lambda-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-fastboot-api-lambda',

  createDeployPlugin: function(options) {
    return new FastbootAPILambdaDeployPlugin({
      name: options.name
    });
  }
};
