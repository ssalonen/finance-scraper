/* eslint-env node, mocha */

const chai = require('chai')
chai.use(require('chai-as-promised'))

const { expect } = chai
const nock = require('nock')
const index = require('../index')
const parse = index.parseUrl
const processAll = index.processAll
const responses = require('./morningstar_responses')

describe('Parsing tests', () => {
  beforeEach(() => {
    nock('http://www.morningstar.fi')
      .get('/fi/etf/snapshot/snapshot.aspx?id=myetf')
      .reply(200, responses.etf)

    nock('http://tools.morningstar.fi')
      .get('/fi/stockreport/default.aspx?SecurityToken=myid')
      .reply(200, responses.stock)

    nock('http://www.morningstar.fi')
      .get('/fi/funds/snapshot/snapshot.aspx?id=myfund')
      .reply(200, responses.fund)
  })

  it('etf parsed correctly', () => {
    return expect(parse('http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=myetf'))
      .eventually.to.deep.include(
        {
          isin: 'IE00B4L5Y983',
          name: 'iShares Core MSCI World UCITS ETF',
          value: 47.84,
          valueDate: '2018-07-24T12:00:00Z'
        }
      )
  })

  it('stock parsed correctly', () => {
    return expect(parse('http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=myid'))
      .eventually.to.deep.include(
        {
          isin: 'FI0009013403',
          name: 'Kone Corporation',
          value: 48.01,
          valueDate: '2018-07-26T14:30:29Z'
        }
      )
  })

  it('fund parsed correctly', () => {
    return expect(parse('http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=myfund'))
      .eventually.to.deep.include(
        {
          isin: 'NO0010140502',
          name: 'SKAGEN Kon-Tiki A (EUR)',
          value: 86.82,
          valueDate: '2018-07-25T12:00:00Z'
        }
      )
  })

  it('fund+stock processAll', async () => {
    const actual = await processAll([
      'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=myid',
      'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=myfund'
    ])
    expect(actual)
      .to.be.an('array')
      .and.to.have.length(2)
    expect(actual[0]).to.deep.include({
      isin: 'FI0009013403',
      name: 'Kone Corporation',
      value: 48.01,
      valueDate: '2018-07-26T14:30:29Z'
    })
    expect(actual[1]).to.deep.include({
      isin: 'NO0010140502',
      name: 'SKAGEN Kon-Tiki A (EUR)',
      value: 86.82,
      valueDate: '2018-07-25T12:00:00Z'
    })
  })
})
