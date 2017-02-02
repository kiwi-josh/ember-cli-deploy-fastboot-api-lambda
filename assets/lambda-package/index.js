// ember-cli-deploy-fastboot-api-lambda

var config    = require('./config.json');
var mime      = require('mime');
var nodePath  = require('path');
var fs        = require('fs-promise');
var FastBoot  = require('fastboot');

var fancyACacheYeh = {
  yes: 'max-age=63072000, public',
  no: 'max-age=0, public'
};

var defaults = {
  distPath: 'dist',
  fallbackPath: '/',
  protocol: 'https',
  host: 'localhost:4200',
  assetsPath: '/assets/',
  stringyExtensions: [
    'html',
    'css',
    'js',
    'json',
    'xml',
    'ico',
    'txt',
    'map'
  ],
  validAssetPaths: [
    '/assets/',
    '/robots.txt',
    '/humans.txt',
    '/crossdomain.xml',
    '/sitemap.xml'
  ],
  headers: {
    'Content-Type': 'text/html;charset=UTF-8',
    'Cache-Control': fancyACacheYeh.no
  },
  fastBootOptions: {
    request: {
      headers: {},
      get: function() {}
    },
    response: {}
  }
};

// Merge config: start
var distPath = config.distPath || defaults.distPath;
var fallbackPath = config.fallbackPath || defaults.fallbackPath;
var protocol = config.protocol || defaults.protocol;
var host = config.host || defaults.host;
var validAssetPaths = defaults.validAssetPaths.concat(config.validAssetPaths || []);
var stringyExtensions = defaults.stringyExtensions.concat(config.stringyExtensions || []);
// Merge config: end

// Instantiate Fastboot server
var app = new FastBoot({ distPath: distPath });

var serveACheekyFile = (path, staticPath, fileBuffer) => {
  // 1. Early exit bail
  var isAssetValidPath = validAssetPaths.find(p => p.includes(path));
  console.log('INFO isAssetValidPath:', isAssetValidPath);
  if (!isAssetValidPath) { throw true; }

  // 1. Look up files content type.
  var contentType = mime.lookup(staticPath);

  //2. Get file extension.
  var extension = mime.extension(contentType); 

  //3. If it isn't a standard file, then base64 encode it. 
  var shouldEncode = stringyExtensions.indexOf(extension) < 0;

  //4. Determine if the item is fingerprinted/cacheable
  var shouldCache = staticPath.includes(defaults.assetsPath);

  //5. Set encoding value
  var encoding = shouldEncode ? 'base64' : 'utf8';

  //6. Create headers
  var headers = {
    'Content-Type': contentType,
    'Cache-Control': shouldCache ? fancyACacheYeh.yes : fancyACacheYeh.no
  };

  //7. Create body
  var body = fileBuffer.toString(encoding);

  //8. Create final output
  var payload = {
    statusCode: 200,
    headers: headers,
    body: body,
    isBase64Encoded: shouldEncode
  };

  console.log('INFO: contentType:', contentType);
  console.log('INFO: extension:', extension);
  console.log('INFO: stringyExtensions:', stringyExtensions);
  console.log('INFO: shouldEncode:', shouldEncode);
  console.log('INFO: shouldCache:', shouldCache);
  console.log('INFO: encoding:', encoding);

  return payload;
};


var doSomeFastBoot = (event, path) => {
  
  // 1. Create options
  var options = defaults.fastBootOptions;
  options.request.headers = event.headers || {};
  options.request.protocol = (event.headers || {})['X-Forwarded-Proto'] || protocol;
  options.request.headers.host = (event.headers || {}).Host || host;
  if (event.cookie) {
    options.request.headers.cookie = event.cookie;
  }

  console.log('INFO: options:', options);

  // 2. Fire up fastboot server
  return app.visit(path, options)
  .then(function(result) {

    var statusCode = result.statusCode;

    // Not interested yo. Wheres that sweet 200's at?
    if (statusCode !== 200) { throw true; }

    return result.html()
    .then(function(html) {

      // 3. Create headers object
      var headers = Object.assign(result.headers.headers, defaults.headers);

      console.log('INFO: headers:', headers);

      // 4. Create payload
      var payload = {
        statusCode: statusCode,
        headers: headers,
        body: html
      };

      return payload;
    });
  });

};

exports.handler = function(event, context, callback) {
  console.log('INFO event:', event);

  var path = event.path || fallbackPath;
  var staticPath = nodePath.join(distPath, path);

  console.log('INFO path:', path);
  console.log('INFO staticPath:', staticPath);

  return fs.readFile(staticPath)
  .then(fileBuffer => serveACheekyFile(path, staticPath, fileBuffer), () => doSomeFastBoot(event, path))
  .then(r => callback(null, r), () => doSomeFastBoot(event, fallbackPath))
  .then(r => callback(null, r))
  .catch(error => {
    console.log('INFO: ERROR:', error);
    return callback(error);
  });
};
