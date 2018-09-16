/* jslint node: true */

'use strict'

const moment = require('moment-timezone')
const dynamodb = require('./dynamodb-service')
const SortedArrayMap = require('collections/sorted-array-map')

const { TABLE_NAME } = require('./constants')

function appendItemData (allData, itemData) {
  const valueDate = itemData.valueDate.S
  const value = itemData.value.N
  const isin = itemData.isin.S
  const dateUtc = moment(valueDate).tz('UTC').format().slice(0, 10)
  const entries = allData.get(dateUtc)
  entries.push({
    value,
    isin
  })
  allData.set(dateUtc, entries)
}

async function querySingle (allData, isin, beginQueryStr, endQueryStr, lastEvaluatedKey = undefined) {
  const queryParams = {
    ExpressionAttributeValues: {
      ':isin': {
        S: isin
      },
      ':begin': {
        S: beginQueryStr
      },
      ':end': {
        S: endQueryStr
      }
    },
    KeyConditionExpression: 'isin = :isin AND valueDate BETWEEN :begin AND :end',
    TableName: TABLE_NAME
  }
  if (lastEvaluatedKey !== undefined) {
    queryParams.ExclusiveStartKey = lastEvaluatedKey
  }

  let queryResults
  try {
    queryResults = await dynamodb.query(queryParams).promise()
  } catch (err) {
    console.error('ERROR when querying dynamoDB')
    console.error(err)
    throw err
  }
  lastEvaluatedKey = queryResults.lastEvaluatedKey
  console.log(`DynamoDB query response received: ${queryResults.Items.length} items`)
  queryResults.Items.forEach(itemData => {
    appendItemData(allData, itemData)
  })

  return lastEvaluatedKey
}

async function queryData (isins, begin, end, requireAllEntries = true) {
  const beginQueryStr = moment(begin).tz('UTC').format()
  const endQueryStr = moment(end).tz('UTC').format()
  const allData = new SortedArrayMap()
  allData.getDefault = dateKey => []

  await Promise.all(
    isins
      .map(async (isin) => {
        let lastEvaluatedKey
        do {
          lastEvaluatedKey = await querySingle(allData, isin, beginQueryStr, endQueryStr, lastEvaluatedKey)
          if (lastEvaluatedKey === undefined) {
            break
          }
        } while (true)
      }))
  if (requireAllEntries) {
    return allData.filter((entry, dateKey) => entry.length === isins.length)
  } else {
    return allData
  }
}

exports.handler = async function (event) {
  // See https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
  try {
    console.log('Event: ', JSON.stringify(event, null, '\t'))
    const { begin, end, requireAllEntries } = event.queryStringParameters
    const { isins } = event.multiValueQueryStringParameters
    const allData = await queryData(isins, begin, end, requireAllEntries)
    return { statusCode: 200, body: allData.toJSON() }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: JSON.stringify({ error_message: err }) }
  }
}
