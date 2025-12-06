/* jslint node: true */

'use strict'

import moment from 'moment-timezone'
import { client as dynamodb, BatchWriteItemCommand } from './dynamodb-service.js'
import { client as s3, PutObjectCommand } from './s3-service.js'
import { ISIN_TO_PARSER_AND_URL_AND_NAME, validateParsedData } from './parsers.js'
import { BUCKET, TABLE_NAME, DYNAMODB_BATCH_SIZE } from './constants.js'

const HTTP_REQUEST_TIMEOUT_MS = 3000

moment.tz.add('EEST|EET-summer-variant1|-30|0|')
moment.tz.add('EEDT|EET-summer-variant2|-30|0|')

// SELIGSON_URLS = [url for url in _INSTRUMENT_URL_TO_NAME if 'seligson' in url]

async function storeRawToS3 (isin, fetchDate, textBody, bucket) {
  try {
    const key = `${isin}-${fetchDate.replace(/:/g, '')}`
    // var tags = querystring.stringify({ url })
    const command = new PutObjectCommand({
      Body: textBody,
      Bucket: bucket,
      Key: key,
      ServerSideEncryption: 'AES256' // ,
      // Tagging: tags
    })
    return await s3.send(command)
  } catch (e) {
    console.error(`ERROR storing ${isin} to S3 ${e}`)
    throw e
  }
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
            isin: {
              S: item.isin
            },
            value: {
              N: item.value.toString()
            },
            valueDate: {
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
    promises.push(dynamodb.send(new BatchWriteItemCommand(request)))
  }
  try {
    return await Promise.all(promises)
  } catch (e) {
    console.error(`ERROR storing data to DynamoDB: ${e}`)
    console.error(e)
  }
}

async function processIsin (bucket, tableName, isin) {
  console.log(`Fetching ${isin}`)
  if (!(isin in ISIN_TO_PARSER_AND_URL_AND_NAME)) {
    throw new Error(`Unknown ISIN: ${isin}`)
  }
  const [parser, url, name] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
  console.log(`Fetching ${name} (isin ${isin}) from ${url}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS) })
  if (!res.ok) {
    throw new Error(`HTTP status ${res.status} not ok returned from url ${url}`)
  }
  const fetchDate = moment().tz('UTC').format()
  const textBody = await res.text()
  // TODO: check age of previous s3, abort if new enough
  console.log(`Storing ${url} to S3`)
  const promiseS3 = storeRawToS3(isin, fetchDate, textBody, bucket)
  console.log(`Stored ${url} to S3`)
  console.log(`Parsing ${url}`)
  const parsedData = await parser(isin, url, textBody)
  validateParsedData(parsedData)
  console.log(`Parsed ${url}. Storing to dynamoDB`)
  await promiseS3
  await storeParsedToDynamoDB(tableName, parsedData)
  return parsedData
}

async function processAll (bucket, table, isins) {
  // TODO: error handling
  console.log(`processAll: ${isins}`)
  const data = Promise.all(
    isins
      .map(async (isin) => {
        try {
          console.log(`processIsin: ${isin}`)
          const parsedData = await processIsin(bucket, table, isin)
          console.log(`processIsin completed for: ${isin}`)
          return parsedData
        } catch (e) {
          console.error(`ERROR: error processing ${isin}. Will proceed to next item. Details: ${e}`)
          console.error(e)
        }
      })
  )
  return data
}

export { storeParsedToDynamoDB, processIsin, processAll }

export async function handler (event) {
  try {
    console.log('Event: ', JSON.stringify(event, null, '\t'))
    await processAll(BUCKET, TABLE_NAME, event.isins)
    return 'Success'
  } catch (err) {
    console.error(err)
    return err
  }
}
