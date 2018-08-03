'use strict'

const aws = require('aws-sdk')
module.exports = new aws.DynamoDB({apiVersion: '2012-08-10'})
