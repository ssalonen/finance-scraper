/* eslint-env node, mocha */

const sinon = require('sinon')
const chai = require('chai')
chai.use(require('sinon-chai'))

// AWS services to be mocked. Imported before main code
const dynamodb = require('../lib/dynamodb-service')
const s3 = require('../lib/s3-service')

const { expect } = chai
const nock = require('nock')
const responses = require('./morningstar_responses')

const { testSeligsonDynamoStubCalls } = require('./scraper_index.test.helpers')

const BUCKET = 'dummy-bucket'
const TABLE = 'dummy-table'

describe('Tests', () => {
  let dynamoStub, s3Stub, sandbox
  let index, processIsin, processAll

  before(() => {
    sandbox = sinon.createSandbox()

    dynamoStub = sandbox.stub(dynamodb, 'batchWriteItem')
    s3Stub = sandbox.stub(s3, 'putObject')

    // 2018-08-03 13:04:56
    sandbox.useFakeTimers(1533301496000)

    dynamoStub.returns({
      promise: () => Promise.resolve(undefined)
    })

    s3Stub.returns({
      promise: () => Promise.resolve(undefined)
    })

    index = require('../lib/scraper_index')
    processIsin = index.processIsin
    processAll = index.processAll
  })

  beforeEach(() => {
    nock('http://www.morningstar.fi')
      .get('/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0')
      .reply(200, responses.etf)

    nock('http://www.morningstar.fi')
      .get('/fi/etf/snapshot/snapshot.aspx?id=0P0000HNXD')
      .reply(200, responses.etf2)

    nock('http://tools.morningstar.fi')
      .get('/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL')
      .reply(200, responses.stock)

    nock('http://www.morningstar.fi')
      .get('/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP')
      .reply(200, responses.fund)

    nock('http://www.morningstar.fi')
      .get('/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI')
      .reply(200, responses.fund2)

    nock('http://www.seligson.fi')
      .get('/graafit/rahamarkkina.csv')
      .reply(200, responses.seligsonRahamarkkina)
  })

  afterEach(() => {
    sandbox.resetHistory()
    nock.cleanAll()
  })

  after(() => {
    sandbox.restore()
  })

  it('etf parsed correctly', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'IE00B4L5Y983'
    )
    expect(parsedData).to.deep.include({
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World UCITS ETF',
      value: 47.84,
      valueDate: '2018-07-24T12:00:00Z'
    })
  })

  it('etf2 parsed correctly (both Lopetushinta & Osuuden arvo, should pick most recent)', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'LU0380865021'
    )
    expect(parsedData).to.deep.include({
      isin: 'LU0380865021',
      name: 'db x-trackers Euro Stoxx 50 UCITS ETF (DR) 1C (EUR) DXET',
      value: 49.85,
      valueDate: '2020-08-14T12:00:00Z'
    })
  })

  it('stock processed correctly', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'FI0009013403'
    )
    expect(parsedData).to.deep.include({
      isin: 'FI0009013403',
      name: 'Kone Corporation',
      value: 48.01,
      valueDate: '2018-07-26T14:30:29Z'
    })
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.stock.toString(),
      Bucket: BUCKET,
      Key:
        'FI0009013403-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Ftools.morningstar.fi%2Ffi%2Fstockreport%2Fdefault.aspx%3FSecurityToken%3Dmyid'
    })
    expect(dynamoStub).to.have.been.calledWith({
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'FI0009013403' },
                value: { N: '48.01' },
                valueDate: { S: '2018-07-26T14:30:29Z' }
              }
            }
          }
        ]
      }
    })
  })

  it('fund processed correctly', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'NO0010140502'
    )
    expect(parsedData).to.deep.include({
      isin: 'NO0010140502',
      name: 'SKAGEN Kon-Tiki A (EUR)',
      value: 86.82,
      valueDate: '2018-07-25T12:00:00Z'
    })
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.fund.toString(),
      Bucket: BUCKET,
      Key:
        'NO0010140502-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Fwww.morningstar.fi%2Ffi%2Ffunds%2Fsnapshot%2Fsnapshot.aspx%3Fid%3Dmyfund'
    })
    expect(dynamoStub).to.have.been.calledWith({
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'NO0010140502' },
                value: { N: '86.82' },
                valueDate: { S: '2018-07-25T12:00:00Z' }
              }
            }
          }
        ]
      }
    })
  })

  it('fund2 processed correctly (two overviewKeyStats tables)', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'LU0839027447'
    )
    console.log(parsedData)
    expect(parsedData).to.deep.include({
      isin: 'LU0839027447',
      name: 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)',
      value: 18.56,
      valueDate: '2018-10-05T12:00:00Z'
    })
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.fund2.toString(),
      Bucket: BUCKET,
      Key:
        'LU0839027447-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Fwww.morningstar.fi%2Ffi%2Ffunds%2Fsnapshot%2Fsnapshot.aspx%3Fid%3Dmyfund'
    })
    expect(dynamoStub).to.have.been.calledWith({
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'LU0839027447' },
                value: { N: '18.56' },
                valueDate: { S: '2018-10-05T12:00:00Z' }
              }
            }
          }
        ]
      }
    })
  })

  it('seligson processed correctly', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'FI0008801733'
    )
    expect(parsedData).to.be.lengthOf(60)
    // test first and last values
    expect(parsedData).to.deep.include({
      isin: 'FI0008801733',
      name: 'Seligson & Co Rahamarkkinarahasto AAA A',
      value: 2.5121,
      valueDate: '2018-06-08T12:00:00Z'
    })
    expect(parsedData).to.deep.include({
      isin: 'FI0008801733',
      name: 'Seligson & Co Rahamarkkinarahasto AAA A',
      value: 2.511,
      valueDate: '2018-08-31T12:00:00Z'
    })
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.seligsonRahamarkkina.toString(),
      Bucket: BUCKET,
      Key:
        'FI0008801733-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Fwww.morningstar.fi%2Ffi%2Ffunds%2Fsnapshot%2Fsnapshot.aspx%3Fid%3Dmyfund'
    })
    testSeligsonDynamoStubCalls(expect, dynamoStub)
  })

  it('stock+fund processAll', async () => {
    const actual = await processAll(BUCKET, TABLE, [
      'FI0009013403',
      'NO0010140502'
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

    // stock
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.stock.toString(),
      Bucket: BUCKET,
      Key:
        'FI0009013403-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Ftools.morningstar.fi%2Ffi%2Fstockreport%2Fdefault.aspx%3FSecurityToken%3Dmyid'
    })
    expect(dynamoStub).to.have.been.calledWith({
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'FI0009013403' },
                value: { N: '48.01' },
                valueDate: { S: '2018-07-26T14:30:29Z' }
              }
            }
          }
        ]
      }
    })

    // fund
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.fund.toString(),
      Bucket: BUCKET,
      Key:
        'NO0010140502-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256' // ,
      // Tagging: 'url=http%3A%2F%2Fwww.morningstar.fi%2Ffi%2Ffunds%2Fsnapshot%2Fsnapshot.aspx%3Fid%3Dmyfund'
    })
    expect(dynamoStub).to.have.been.calledWith({
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'NO0010140502' },
                value: { N: '86.82' },
                valueDate: { S: '2018-07-25T12:00:00Z' }
              }
            }
          }
        ]
      }
    })
  })
})
