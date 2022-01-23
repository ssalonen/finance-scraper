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
    const s3Object = await s3.getObject({ Bucket: BUCKET, Key: entry.Key }).promise()
    const textBody = s3Object.Body.toString('utf-8')
    const [parser, url, _] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
    let parsedData = null
    try {
      parsedData = await parser(isin, url, textBody)
    } catch (e) {
      console.warn(`Failed to parse ${entry.Key}: ${e}. Skipping`)
      continue
    }
    validateParsedData(parsedData)
    if (!DRY_RUN) {
      console.log(`Parsed ${url}, storing to dynamoDB: ${JSON.stringify(parsedData)}`)
      await storeParsedToDynamoDB(TABLE_NAME, parsedData)
    } else {
      console.log(`Parsed ${url}, skipping store to dynamoDB due to DRY_RUN: ${JSON.stringify(parsedData)}`)
    }
  }
}

const DRY_RUN = true

if (DRY_RUN) {
  console.log('dry-run => skipping storage to dynamodb')
  console.log('(waiting 1sec)')
}

setTimeout(() => {
  for (const isin of ['FI0008801980']) {
    for (const suffix of ['-2021-12-2', '-2021-12-3', '-2022-01']) {
      reprocess(isin, `${isin}${suffix}`)
    }
  }

  console.log('done')
}, DRY_RUN ? 1000 : 0)
