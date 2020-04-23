/* jslint node: true */

'use strict'
const { Readable } = require('stream')
const csv = require('csv-parser')
const cheerio = require('cheerio')
const moment = require('moment-timezone')

const twoMonthSeligsonParser = (...params) => seligsonParser(...params, 60)
const ISIN_TO_PARSER_AND_URL_AND_NAME = {
  LU0839027447: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI', 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)'],
  NO0010140502: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP', 'SKAGEN Kon-Tiki A (EUR)'],
  SE0005991445: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000UF2B', 'Handelsbanken Euro Obligaatio (A1 EUR)'],
  FI0008803812: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04O7X', 'PYN Elite Fund'],
  IE00B52MJY50: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000RTOH', 'Aasia ilman Japania iShares Core MSCI Pacific ex Japan UCITS ETF EUR SXR1 F Kasvu'],
  IE00B4L5Y983: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0', 'iShares Core MSCI World UCITS ETF'],
  SE0005993102: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000TH8W', 'Nordnet Superrahasto Suomi'],
  FI0008801790: [twoMonthSeligsonParser, 'https://www.seligson.fi/graafit/global-brands.csv', 'Seligson & Co Global Top 25 Brands Fund (A)'],
  FI0008800321: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04OGI', 'FIM Euro'],
  FI0008801733: [twoMonthSeligsonParser, 'http://www.seligson.fi/graafit/rahamarkkina.csv', 'Seligson & Co Rahamarkkinarahasto AAA A'],
  LU0274211480: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000M7ZP', 'Saksa db x-trackers DAX UCITS ETF EUR DBXD F Kasvu'],
  LU0380865021: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000HNXD', 'db x-trackers Euro Stoxx 50 UCITS ETF (DR) 1C (EUR) DXET'],
  FI0008801980: [twoMonthSeligsonParser, 'https://www.seligson.fi/graafit/global-pharma.csv', 'Seligson & Co Global Top 25 Pharmaceuticals A'],
  FI0009013403: [morningStarStockParser, 'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL', 'Kone Corporation'],
  SE0002756973: [morningStarEtfOrFundParser, 'https://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F000002J6V', 'Nordnet Indexfond Sverige']
}

const RE_EXTRACT_VALUE = /(\d+,\d+)/
const MORNINGSTAR_PRICE_COLUMN_REGEX = /Osuuden arvo|Myyntikurssi|Lopetushinta/

function extractFieldFromOverviewKeyStats ($, colRegexp, tdIndex) {
  const matched = $('.overviewKeyStatsTable tr td:nth-child(1)')
    .filter((i, node) => colRegexp.test($(node).text()))
  if (matched.length === 0) {
    throw new Error(`Could not find ${colRegexp}`)
  } else if (matched.length !== 1) {
    throw new Error(`No unique match for ${colRegexp}`)
  }
  const trNode = matched[0].parentNode
  console.log($(`td:nth-child(${tdIndex + 1})`, trNode).text())
  return $(`td:nth-child(${tdIndex + 1})`, trNode).text()
}

function extractHeaderFromOverviewKeyStats ($, colRegexp) {
  return extractFieldFromOverviewKeyStats($, colRegexp, 0)
}

function extractValueFromOverviewKeyStats ($, colRegexp) {
  return extractFieldFromOverviewKeyStats($, colRegexp, 2)
}

async function morningStarEtfOrFundParser (isin, url, textBody) {
  const $ = cheerio.load(textBody)
  const dateDDMMYY = extractHeaderFromOverviewKeyStats($, MORNINGSTAR_PRICE_COLUMN_REGEX).slice(-10)
  const valueDateMoment = moment(
    `${dateDDMMYY.slice(6, 10)}-${dateDDMMYY.slice(3, 5)}-${dateDDMMYY.slice(0, 2)}T12:00:00Z`).tz('UTC')
  if (!valueDateMoment.isValid()) {
    throw Error(`ERROR: error parsing date ${dateDDMMYY}`)
  }
  const valueDate = valueDateMoment.format()
  const valueRaw = extractValueFromOverviewKeyStats($, MORNINGSTAR_PRICE_COLUMN_REGEX)
  const value = Number.parseFloat(RE_EXTRACT_VALUE.exec(valueRaw)[0].replace(',', '.'))
  const isinPage = extractValueFromOverviewKeyStats($, /ISIN/)
  if (isin !== isinPage) {
    throw Error(`Given ISIN=${isin} not patching ISIN found from page ${isinPage}`)
  }
  const [, , name] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
  if (!name) {
    throw Error(`Unknown ISIN ${isin}`)
  }

  return [{ name, isin, value, valueDate }]
}

async function morningStarStockParser (isin, url, textBody) {
  const $ = cheerio.load(textBody)
  const priceItem = $('span#Col0Price.price').text().replace(',', '.')
  const value = Number.parseFloat(priceItem)
  // Parse date from
  //    Päivitetty 24.07.201817:37:27 EEST | EUR
  const datetimeRaw = $('p#Col0PriceTime.priceInformation').text().split(' ').slice(1, 3).join(' ')
  const dateTimeIso = (
    `${datetimeRaw.slice(6, 10)}-${datetimeRaw.slice(3, 5)}-${datetimeRaw.slice(0, 2)}T${datetimeRaw.slice(10, 18)}`)
  const tz = datetimeRaw.slice(19)
  const valueDateMoment = moment.tz(dateTimeIso, tz).tz('UTC')
  const valueDate = valueDateMoment.format()
  if (!valueDateMoment.isValid()) {
    throw Error(`ERROR: error parsing date ${dateTimeIso}`)
  }
  const isinPage = $('td#Col0Isin').text()
  if (isin !== isinPage) {
    throw Error(`Given ISIN=${isin} not patching ISIN found from page ${isinPage}`)
  }
  const [, , name] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
  if (!name) {
    throw Error(`Unknown ISIN ${isin}`)
  }
  return [{ isin, name, value, valueDate }]
}

async function seligsonParser (isin, url, textBody, daysBack = 3) {
  const rows = []
  const parser = csv({ separator: ';', headers: ['date', 'value'] })
  const s = new Readable()
  s.push(textBody)
  s.push(null)
  const promise = new Promise((resolve, reject) => {
    s.pipe(parser)
      .on('data', data => {
        try {
          const valueDate = moment.tz(
            data.date + ' 12:00', 'DD.MM.YYYY HH:mm',
            'UTC')
          if (!valueDate.isValid()) {
            throw Error(`ERROR: error parsing date ${data.date}`)
          }
          const value = Number.parseFloat(data.value)
          if (Number.isNaN(value)) {
            throw Error(`ERROR: error parsing value ${data.value}`)
          }
          const [, , name] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
          if (!name) {
            throw Error(`ERROR: Unknown Seligson ISIN ${isin}`)
          }
          if (rows.length >= daysBack) {
            rows.shift()
          }
          rows.push({ isin, name, value, valueDate: valueDate.format() })
        } catch (e) {
          console.log(`ERROR: error parsing ${url} line ${JSON.stringify(data)}: ${e}`)
          reject(e)
        }
      })
      .on('finish', () => {
        resolve(rows)
      })
  })
  return promise
}

function validateParsedData (parsedData) {
  parsedData.forEach(row => {
    if (!row.name || !row.value || !row.valueDate) {
      throw Error('Invalid parsed data')
    }
  })
}

exports.validateParsedData = validateParsedData
exports.ISIN_TO_PARSER_AND_URL_AND_NAME = ISIN_TO_PARSER_AND_URL_AND_NAME
