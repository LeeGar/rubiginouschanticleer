var oauthSignature = require('oauth-signature');  
var n = require('nonce')();  
var request = require('request');  
var qs = require('querystring');  
var _ = require('lodash');

var yelp_request = function(userParameters, callback){
  var httpMethod = 'GET';
  var yelpApiUrl = 'http://api.yelp.com/v2/search';
  var consumerSecret = process.env.YELP_CONSUMER_SECRET;
  var tokenSecret = process.env.YELP_TOKEN_SECRET;

  var required_parameters = {
    oauth_consumer_key : process.env.YELP_CONSUMER_KEY,
    oauth_token : process.env.YELP_TOKEN,
    oauth_nonce : n(),
    oauth_timestamp : n().toString().substr(0,10),
    oauth_signature_method : 'HMAC-SHA1',
    oauth_version : '1.0',
    limit: 20
  };

  var parameters = _.assign(userParameters, required_parameters);
  var signature = oauthSignature.generate(httpMethod, yelpApiUrl, parameters, consumerSecret, tokenSecret, { encodeSignature: false});
  parameters.oauth_signature = signature;
  var parameterURL = qs.stringify(parameters);
  var queryUrl = yelpApiUrl + '?' + parameterURL;

  request(queryUrl, function(error, response, body){
    console.log('request body is: ', body);
    return callback(error, response, body);
  });

};

module.exports = yelp_request;