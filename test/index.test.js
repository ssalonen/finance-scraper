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

const BUCKET = 'dummy-bucket'
const TABLE = 'dummy-table'

describe('Tests', () => {
  let dynamoStub, s3Stub, sandbox
  let index, processUrl, processAll

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

    index = require('../lib/index')
    processUrl = index.processUrl
    processAll = index.processAll
  })

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

  afterEach(() => {
    sandbox.resetHistory()
    nock.cleanAll()
  })

  after(() => {
    sandbox.restore()
  })

  it('etf parsed correctly', async () => {
    const parsedData = await processUrl(
      BUCKET,
      TABLE,
      'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=myetf'
    )
    expect(parsedData).to.deep.include({
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World UCITS ETF',
      value: 47.84,
      valueDate: '2018-07-24T12:00:00Z'
    })
  })

  it('stock processed correctly', async () => {
    const parsedData = await processUrl(
      BUCKET,
      TABLE,
      'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=myid'
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
        '2018-08-03T130456Z-accf18d4004219614ec6faa7b41ec404689e0a2a5999fdca0f9899a0967705d3',
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
    const parsedData = await processUrl(
      BUCKET,
      TABLE,
      'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=myfund'
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
        '2018-08-03T130456Z-9aa3ac4283686c368174e50daa34cd8cbb6b198662325962d4a38384aa2461d1',
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

  it('fund+stock processAll', async () => {
    const actual = await processAll(BUCKET, TABLE, [
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

    // stock
    expect(s3Stub).to.have.been.calledWith({
      Body: responses.stock.toString(),
      Bucket: BUCKET,
      Key:
        '2018-08-03T130456Z-accf18d4004219614ec6faa7b41ec404689e0a2a5999fdca0f9899a0967705d3',
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
        '2018-08-03T130456Z-9aa3ac4283686c368174e50daa34cd8cbb6b198662325962d4a38384aa2461d1',
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
