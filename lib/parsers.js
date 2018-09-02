/* jslint node: true */

'use strict'
const { Readable } = require('stream')
const csv = require('csv-parser')
const cheerio = require('cheerio')
const moment = require('moment-timezone')

const SELIGSON_URL_TO_ISIN = {
  'https://www.seligson.fi/graafit/global-pharma.csv': 'FI0008801980',
  'https://www.seligson.fi/graafit/global-brands.csv': 'FI0008801790',
  'https://www.seligson.fi/graafit/rahamarkkina.csv': 'FI0008801733'
}

// Mapping from ISIN ID to name of the instrument. Keys acts as whitelist of scraped instruments.
const ISIN_TO_NAME = {
  FI0009013403: 'Kone Corporation',
  IE00B4L5Y983: 'iShares Core MSCI World UCITS ETF',
  NO0010140502: 'SKAGEN Kon-Tiki A (EUR)',
  FI0008801980: 'Seligson & Co Global Top 25 Pharmaceuticals A',
  FI0008801790: 'Seligson & Co Global Top 25 Brands Fund (A)',
  FI0008801733: 'Seligson & Co Rahamarkkinarahasto AAA A',
  FI0008800321: 'FIM Euro',
  SE0005991445: 'Handelsbanken Euro Obligaatio (A1 EUR)',
  LU0274211480: 'Saksa db x-trackers DAX UCITS ETF EUR DBXD F Kasvu',
  IE00B52MJY50: 'Aasia ilman Japania iShares Core MSCI Pacific ex Japan UCITS ETF EUR SXR1 F Kasvu',
  SE0005993102: 'Nordnet Superrahasto Suomi',
  LU0380865021: 'db x-trackers Euro Stoxx 50 UCITS ETF (DR) 1C (EUR) DXET',
  LU0839027447: 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)',
  FI0008803812: 'PYN Elite Fund'
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

  return [{ name, isin, value, valueDate }]
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
  return [{ isin, name, value, valueDate }]
}

function seligsonParser (url, textBody) {
  const rows = []
  const parser = csv({separator: ';', headers: ['date', 'value']})
  const s = new Readable()
  s.push(textBody)
  s.push(null)
  s.pipe(parser)
    .on('data', data => {
      try {
        const valueDate = moment.tz(
          data.date + ' 12:00', 'DD.MM.YYYY HH:mm',
          'UTC').format()
        // FIXME: process only events from x days back, e.g. 180 days?

        if (!valueDate.isValid()) {
          throw Error(`ERROR: error parsing date ${data.date}`)
        }
        const value = Number.parseFloat(data.value)
        if (Number.isNaN(value)) {
          throw Error(`ERROR: error parsing value ${data.value}`)
        }
        const isin = SELIGSON_URL_TO_ISIN[url]
        if (!isin) {
          throw Error(`ERROR: Unknown Seligson URL ${url}`)
        }
        const name = ISIN_TO_NAME[isin]
        if (!name) {
          throw Error(`ERROR: Unknown Seligson ISIN ${isin}`)
        }
        rows.push({ isin, name, value, valueDate })
      } catch (e) {
        console.log(`ERROR: error parsing ${url} line ${data}: ${e}`)
      }
    })
  return rows
}

function validateParsedData (parsedData) {
  parsedData.forEach(row => {
    if (!row.name || !row.value || !row.valueDate) {
      throw Error('Invalid parsed data')
    }
  })
}

function getParserForUrl (url) {
  if (url.match(/^https?:\/\/www.morningstar.fi\/fi\/etf\/snapshot\/snapshot.aspx\?id=/)) {
    return morningStarEtfOrFundParser
  } else if (url.match(/^https?:\/\/www.morningstar.fi\/fi\/funds\/snapshot\/snapshot.aspx\?id=/)) {
    return morningStarEtfOrFundParser
  } else if (url.match(/^https?:\/\/tools.morningstar.fi\/fi\/stockreport\/default.aspx\?SecurityToken=/)) {
    return morningStarStockParser
  } else if (url.match(/^https?:\/\/www.seligson.fi\/graafit\/.*\.csv/)) {
    return seligsonParser
  }
  throw Error(`No parser for ${url}`)
}

exports.validateParsedData = validateParsedData
exports.getParserForUrl = getParserForUrl
