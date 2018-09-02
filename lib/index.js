/* jslint node: true */

'use strict'

const fetch = require('node-fetch')
const moment = require('moment-timezone')
// const querystring = require('querystring')
const crypto = require('crypto')
const dynamodb = require('./dynamodb-service')
const s3 = require('./s3-service')
const {validateParsedData, getParserForUrl} = require('./parsers')

moment.tz.add('EEST|EET-summer|-30|0|')
moment.tz.add('EEDT|EET-summer|-30|0|')

// SELIGSON_URLS = [url for url in _INSTRUMENT_URL_TO_NAME if 'seligson' in url]

const BUCKET = 'finance-scraper-bucket'
const TABLE_NAME = 'finance_scraper'
const DYNAMODB_BATCH_SIZE = 25

async function storeRawToS3 (url, fetchDate, textBody, bucket) {
  const urlHash = crypto.createHash('sha256').update(url).digest('hex')
  const key = `${fetchDate.replace(/:/g, '')}-${urlHash}`
  // var tags = querystring.stringify({ url })
  return s3.putObject({
    Body: textBody,
    Bucket: bucket,
    Key: key,
    ServerSideEncryption: 'AES256' // ,
    // Tagging: tags
  }).promise()
}

async function storeParsedToDynamoDB (tableName, parsedData) {
  const promises = []
  for (let batchIndex = 0; true; batchIndex++) {
    const batch = parsedData.slice(
      batchIndex * DYNAMODB_BATCH_SIZE,
      (batchIndex + 1) * DYNAMODB_BATCH_SIZE)
    if (batch.length === 0) {
      break
    }
    const putRequests = batch.map(item => {
      return {
        PutRequest: {
          Item: {
            'isin': {
              S: item.isin
            },
            'value': {
              N: item.value.toString()
            },
            'valueDate': {
              S: item.valueDate
            }
          }
        }
      }
    })

    const request = {
      RequestItems: {
        [tableName]: putRequests
      }
    }
    // FIXME: handle UnprocessedItems
    // JS SDK does not handle individual fails in any way
    promises.push(dynamodb.batchWriteItem(request).promise())
  }
  return Promise.all(promises)
}

async function processUrl (bucket, tableName, url) {
  console.log(`Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP status != 200 returned from url ${url}`)
  }
  const fetchDate = moment().tz('UTC').format()
  const textBody = await res.text()
  // TODO: check age of previous s3, abort if new enough
  console.log(`Storing ${url} to S3`)
  await storeRawToS3(url, fetchDate, textBody, bucket)
  console.log(`Stored ${url} to S3`)
  console.log(`Parsing ${url}`)
  const parser = getParserForUrl(url)
  const parsedData = parser(url, textBody)
  validateParsedData(parsedData)
  console.log(`Parsed ${url}. Storing to dynamoDB`)
  await storeParsedToDynamoDB(tableName, parsedData)
  return parsedData
}
exports.processUrl = processUrl

async function processAll (bucket, table, urls) {
  // TODO: error handling
  console.log(`processAll: ${urls}`)
  const data = Promise.all(
    urls
      .map(async (url) => {
        try {
          console.log(`processUrl: ${url}`)
          const parsedData = await processUrl(bucket, table, url)
          console.log(`processUrl completed for: ${url}`)
          return parsedData
        } catch (e) {
          console.log(`ERROR: error parsing ${url}: ${e}`)
        }
      })
  )
  return data
}
exports.processAll = processAll

exports.handler = async function (event, context) {
  try {
    console.log('Event: ', JSON.stringify(event, null, '\t'))
    console.log('Context: ', JSON.stringify(context, null, '\t'))
    await processAll(BUCKET, TABLE_NAME, event.urls)
    return 'Success'
  } catch (err) {
    console.log(err)
    return err
  }
}
