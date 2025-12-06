/* jslint node: true */

'use strict'

export const BUCKET = process.env.AWS_S3_BUCKET || 'finance-scraper-bucket'  // Override with AWS_S3_BUCKET environment variable or update to match your bucket name
export const TABLE_NAME = 'finance_scraper'
export const DYNAMODB_BATCH_SIZE = 25
