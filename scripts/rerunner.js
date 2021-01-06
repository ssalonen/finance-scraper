/* eslint-disable no-unused-vars */
/* jslint node: true */

'use strict'
const { ISIN_TO_PARSER_AND_URL_AND_NAME, validateParsedData } = require('./../lib/parsers')
const { storeParsedToDynamoDB } = require('./../lib/scraper_index')
const { BUCKET, TABLE_NAME } = require('./../lib/constants')
const s3 = require('./../lib/s3-service')

async function reprocess (isin, prefix) {
  // filenames follow pattern IE00B4L5Y983-2020-08-16T074842Z
  const entries = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: prefix }).promise()
  for (const entry of entries.Contents) {
    console.log(entry.Key)
    if (DRY_RUN) {
      console.log(' dry-run => skipping download and parsing')
    } else {
      const s3Object = await s3.getObject({ Bucket: BUCKET, Key: entry.Key }).promise()
      const textBody = s3Object.Body.toString('utf-8')
      const [parser, url, _] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
      const parsedData = await parser(isin, url, textBody)
      validateParsedData(parsedData)
      console.log(`Parsed ${url}. Storing to dynamoDB`)
      await storeParsedToDynamoDB(TABLE_NAME, parsedData)
    }
  }
}

const DRY_RUN = true
reprocess('IE00B5BMR087', 'IE00B5BMR087-2020')
