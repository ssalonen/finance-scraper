/* jslint node: true */

'use strict'

const fetch = require('node-fetch')
const cheerio = require('cheerio')
const moment = require('moment-timezone')
const querystring = require('querystring')
const crypto = require('crypto')
const dynamodb = require('./dynamodb-service')
const s3 = require('./s3-service')

moment.tz.add('EEST|EET-summer|-30|0|')
moment.tz.add('EEDT|EET-summer|-30|0|')

// _INSTRUMENT_URL_TO_NAME = {
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04UMF': 'Seligson & Co Global Top 25 Pharmaceuticals A',
//   'http://www.seligson.fi/graafit/global-pharma.csv': 'Seligson & Co Global Top 25 Pharmaceuticals A',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04O2R': 'Seligson & Co Global Top 25 Brands Fund (A)',
//   'http://www.seligson.fi/graafit/global-brands.csv': 'Seligson & Co Global Top 25 Brands Fund (A)',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04O2J': 'Seligson & Co Rahamarkkinarahasto AAA A',
//   'http://www.seligson.fi/graafit/rahamarkkina.csv': 'Seligson & Co Rahamarkkinarahasto AAA A',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04OGI': 'FIM Euro',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP': 'SKAGEN Kon-Tiki A (EUR)',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000UF2B': 'Handelsbanken Euro Obligaatio (A1 EUR)',
//   'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000M7ZP': 'Saksa db x-trackers DAX UCITS ETF EUR DBXD F Kasvu',
//   'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000RTOH': 'Aasia ilman Japania iShares Core MSCI Pacific ex Japan UCITS ETF EUR SXR1 F Kasvu',
//   'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0': 'iShares Core MSCI World UCITS ETF',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000TH8W': 'Nordnet Superrahasto Suomi',
//   'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000HNXD': 'db x-trackers Euro Stoxx 50 UCITS ETF (DR) 1C (EUR) DXET',
//   'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL': 'KONE Corporation',
//   'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI': 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)',
//   'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04O7X': 'PYN Elite Fund'
// }

// SELIGSON_URLS = [url for url in _INSTRUMENT_URL_TO_NAME if 'seligson' in url]

const BUCKET = 'finance-scraper-raw-responses'
const TABLE_NAME = 'finance-scraper'

const ISIN_TO_NAME = {
  FI0009013403: 'Kone Corporation',
  IE00B4L5Y983: 'iShares Core MSCI World UCITS ETF',
  NO0010140502: 'SKAGEN Kon-Tiki A (EUR)'
}

const RE_EXTRACT_VALUE = /(\d+,\d+)/

function extractValueFromOverviewKeyStats ($, colRegexp) {
  let rowIndex
  $('.overviewKeyStatsTable tr td:nth-child(1)')
    .each((i, node) => {
      if (colRegexp.test($(node).text())) {
        rowIndex = i
      }
    })
  if (rowIndex === undefined) {
    return undefined
  }
  return $(`.overviewKeyStatsTable tr:nth-child(${rowIndex + 1}) td:nth-child(3)`).text()
}

function morningStarEtfOrFundParser (url, textBody) {
  const $ = cheerio.load(textBody)
  const dateDDMMYY = $('.overviewKeyStatsTable tr:nth-child(2) td:nth-child(1)').text().slice(-10)
  const valueDate = moment(
    `${dateDDMMYY.slice(6, 10)}-${dateDDMMYY.slice(3, 5)}-${dateDDMMYY.slice(0, 2)}T12:00:00Z`).tz('UTC').format()
  const valueRaw = extractValueFromOverviewKeyStats($, /Osuuden arvo|Myyntikurssi|Lopetushinta/)
  const value = Number.parseFloat(RE_EXTRACT_VALUE.exec(valueRaw)[0].replace(',', '.'))
  const isin = extractValueFromOverviewKeyStats($, /ISIN/)
  const name = ISIN_TO_NAME[isin]
  if (!name) {
    throw Error(`Unknown ISIN ${isin}`)
  }

  return { name, isin, value, valueDate }
}

function morningStarStockParser (url, textBody) {
  const $ = cheerio.load(textBody)
  const priceItem = $('span#Col0Price.price').text().replace(',', '.')
  const value = Number.parseFloat(priceItem)
  // Parse date from
  //    Päivitetty 24.07.201817:37:27 EEST | EUR
  const datetimeRaw = $('p#Col0PriceTime.priceInformation').text().split(' ').slice(1, 3).join(' ')
  const dateTimeIso = (
    `${datetimeRaw.slice(6, 10)}-${datetimeRaw.slice(3, 5)}-${datetimeRaw.slice(0, 2)}T${datetimeRaw.slice(10, 18)}`)
  const tz = datetimeRaw.slice(19)
  const valueDate = moment.tz(dateTimeIso, tz).tz('UTC').format()
  const isin = $('td#Col0Isin').text()
  const name = ISIN_TO_NAME[isin]
  if (!name) {
    throw Error(`Unknown ISIN ${isin}`)
  }
  return { isin, name, value, valueDate }
}

function seligsonParser (url, textBody) {
  // const c = cheerio.load(textBody)
  return { name: 'seligson', 'value': 4.0, 'valueDate': '2017' }
}

function validateParsedData (parsedData) {
  if (!parsedData.name || !parsedData.value || !parsedData.valueDate) {
    throw Error('Invalid parsed data')
  }
}

function getParserForUrl (url) {
  if (url.startsWith('http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=')) {
    return morningStarEtfOrFundParser
  } else if (url.startsWith('http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=')) {
    return morningStarEtfOrFundParser
  } else if (url.startsWith('http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=')) {
    return morningStarStockParser
  } else if (url.startsWith('http://www.seligson.fi/graafit/') && url.endsWith('.csv')) {
    return seligsonParser
  }
  throw Error(`No parser for ${url}`)
}

async function storeRawToS3 (url, fetchDate, textBody, bucket) {
  const urlHash = crypto.createHash('sha256').update(url).digest('hex')
  const key = `${fetchDate.replace(/:/g, '')}-${urlHash}`
  var tags = querystring.stringify({ url })
  await s3.putObject({
    Body: textBody,
    Bucket: bucket,
    Key: key,
    ServerSideEncryption: 'AES256',
    Tagging: tags
  }).promise()
}

async function storeParsedToDynamoDB (tableName, isin, value, valueDate) {
  await dynamodb.putItem({
    Item: {
      'isin': {
        S: isin
      },
      'value': {
        N: value.toString()
      },
      'valueDate': {
        S: valueDate
      }
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: tableName
  }).promise()
}

async function processUrl (bucket, tableName, url) {
  console.log(`Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP status != 200 returned from url ${url}`)
  }
  const fetchDate = moment().tz('UTC').format()
  const textBody = await res.text()
  console.log(`Storing ${url} to S3`)
  await storeRawToS3(url, fetchDate, textBody, bucket)
  console.log(`Stored ${url} to S3`)
  console.log(`Parsing ${url}`)
  const parser = getParserForUrl(url)
  const parsedData = parser(url, textBody)
  validateParsedData(parsedData)
  console.log(`Parsed ${url}. Storing parsed data (isin: ${parsedData.isin}, value: ${parsedData.value}, date:${parsedData.valueDate}) to dynamoDB`)
  await storeParsedToDynamoDB(tableName, parsedData.isin, parsedData.value, parsedData.valueDate)
  return parsedData
}
exports.processUrl = processUrl

async function processAll (bucket, table, urls) {
  // TODO: error handling
  return Promise.all(
    urls
      .map(async (url) => {
        try {
          const parsedData = await processUrl(bucket, table, url)
          return parsedData
        } catch (e) {
          console.log(`error with ${url}: ${e}`)
        }
      })
      .map(parsedData => { console.log(parsedData); return parsedData })
  )
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
