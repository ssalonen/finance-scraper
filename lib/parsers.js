/* jslint node: true */

'use strict'
import { Readable } from 'stream'
import csv from 'csv-parser'
import { load as cheerioLoad } from 'cheerio'
import moment from 'moment-timezone'

// Links EDT to mean New York's timezone
moment.tz.link('America/New_York|EDT')

const twoMonthSeligsonParser = (...params) => seligsonParser(...params, 60)
export const ISIN_TO_PARSER_AND_URL_AND_NAME = {
  // Sample ISINs for demonstration. Add more ISINs as needed by following the pattern:
  // ISIN: [parser function, data source URL, instrument name]
  LU0839027447: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI', 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)'],
  FI0009013403: [morningStarStockParser, 'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL', 'Kone Corporation'],
  IE00B5BMR087: [morningStarEtfOrFundParser, 'https://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000OO21', 'iShares Core S&P 500 UCITS ETF USD (Acc) (EUR) SXR8'],
  FI0008801733: [twoMonthSeligsonParser, 'http://www.seligson.fi/graafit/rahamarkkina.csv', 'Seligson & Co Rahamarkkinarahasto AAA A']
}

const RE_EXTRACT_VALUE = /(\d+,\d+)/
const MORNINGSTAR_PRICE_COLUMN_REGEXS = [/Osuuden arvo/, /Myyntikurssi/, /Lopetushinta/]

function extractFieldFromOverviewKeyStats ($, colRegexp, tdIndex) {
  const matched = $('.overviewKeyStatsTable tr td:nth-child(1)')
    .filter((i, node) => colRegexp.test($(node).text()))
  if (matched.length === 0) {
    return null
  } else if (matched.length !== 1) {
    throw new Error(`No unique match for ${colRegexp}`)
  }
  const trNode = matched[0].parentNode
  const cellValue = $(`td:nth-child(${tdIndex + 1})`, trNode).text()
  return cellValue
}

function extractHeaderFromOverviewKeyStats ($, colRegexp) {
  return extractFieldFromOverviewKeyStats($, colRegexp, 0)
}

function extractValueFromOverviewKeyStats ($, colRegexp) {
  return extractFieldFromOverviewKeyStats($, colRegexp, 2)
}

async function morningStarEtfOrFundParser (isin, url, textBody) {
  const $ = cheerioLoad(textBody)

  const isinPage = extractValueFromOverviewKeyStats($, /ISIN/)
  if (isin !== isinPage) {
    throw Error(`Given ISIN=${isin} not patching ISIN found from page ${isinPage}`)
  }
  const [, , name] = ISIN_TO_PARSER_AND_URL_AND_NAME[isin]
  if (!name) {
    throw Error(`Unknown ISIN ${isin}`)
  }

  let date, value, valueDate
  for (const regex of MORNINGSTAR_PRICE_COLUMN_REGEXS) {
    const headerCellText = extractHeaderFromOverviewKeyStats($, regex)
    if (headerCellText === null) {
      console.debug(`Morningstar ETF/Fund parser (ISIN=${isin}): ${regex} header not found`)
      continue
    } else {
      console.debug(`Morningstar ETF/Fund parser (ISIN=${isin}): ${regex} header found `)
    }
    const dateDDMMYY = headerCellText.slice(-10)
    const valueDateMoment = moment(
      `${dateDDMMYY.slice(6, 10)}-${dateDDMMYY.slice(3, 5)}-${dateDDMMYY.slice(0, 2)}T12:00:00Z`).tz('UTC')
    if (!date || (valueDateMoment.isValid() && valueDateMoment.isAfter(date))) {
      const valueCellText = extractValueFromOverviewKeyStats($, regex)
      if (!valueCellText) {
        console.debug(`Morningstar ETF/Fund parser (ISIN=${isin}): ${regex} value not found`)
        continue
      }
      const valueNumeric = Number.parseFloat(RE_EXTRACT_VALUE.exec(valueCellText)[0].replace(/,/g, '.'))
      if (Number.isNaN(valueNumeric)) {
        console.debug(`Morningstar ETF/Fund parser (ISIN=${isin}): ${regex} yield NaN value although date was parsed successfully`)
        continue
      }
      // Everything OK
      date = valueDateMoment
      valueDate = valueDateMoment.format()
      value = valueNumeric

      // Continue the loop and parse others as well
    }
  }
  if (date === null) {
    throw Error('No valid match')
  }

  return [{ name, isin, value, valueDate }]
}

async function morningStarStockParser (isin, url, textBody) {
  const $ = cheerioLoad(textBody)
  const priceItem = $('span#Col0Price.price').text().replace(/,/g, '.')
  const value = Number.parseFloat(priceItem)
  // Parse date from
  //    Päivitetty 24.07.201817:37:27 EEST | EUR
  // or Päivitetty 24.07.201817.37.27 EEST | EUR
  const datetimeRaw = $('p#Col0PriceTime.priceInformation').text().split(' ').slice(1, 3).join(' ')
  const dateTimeIso = (
    `${datetimeRaw.slice(6, 10)}-${datetimeRaw.slice(3, 5)}-${datetimeRaw.slice(0, 2)}T${datetimeRaw.slice(10, 18).replace(/\./g, ':')}`)
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
          console.error(`ERROR: error parsing ${url} line ${JSON.stringify(data)}: ${e}`)
          reject(e)
        }
      })
      .on('finish', () => {
        resolve(rows)
      })
  })
  return promise
}

export function validateParsedData (parsedData) {
  parsedData.forEach(row => {
    if (!row.name || !row.value || !row.valueDate) {
      throw Error(`Invalid parsed data, name=${row.name}, value=${row.value}, valueDate=${row.valueDate}`)
    }
  })
}
