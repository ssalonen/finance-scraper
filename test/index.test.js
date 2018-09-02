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

const {testSeligsonDynamoStubCalls} = require('./index.test.helpers')

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

    index = require('../lib/index')
    processIsin = index.processIsin
    processAll = index.processAll
  })

  beforeEach(() => {
    nock('http://www.morningstar.fi')
      .get('/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0')
      .reply(200, responses.etf)

    nock('http://tools.morningstar.fi')
      .get('/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL')
      .reply(200, responses.stock)

    nock('http://www.morningstar.fi')
      .get('/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP')
      .reply(200, responses.fund)

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
        '2018-08-03T130456Z-d83e521012491f09a4245647a205250be5810f8c8e5124430c38442c192bcc63',
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
        '2018-08-03T130456Z-92217a29e3094cfb0c6917c71ece2db778cb6730ccc7ebba04c611f1caaf355d',
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
        '2018-08-03T130456Z-be33f13674660f18a77fddb6ae8d69697575d9b619db1670917e521b0f206735',
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
        '2018-08-03T130456Z-d83e521012491f09a4245647a205250be5810f8c8e5124430c38442c192bcc63',
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
        '2018-08-03T130456Z-92217a29e3094cfb0c6917c71ece2db778cb6730ccc7ebba04c611f1caaf355d',
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
