/* eslint-env node, mocha */
import { processIsin, processAll } from '../lib/scraper_index.js'
import sinon from 'sinon'
import { use as chaiUse, expect } from 'chai'
import sinonChai from 'sinon-chai'
import { Agent, MockAgent, setGlobalDispatcher } from 'undici'

// AWS services to be mocked. Imported before main code
import { client as dynamodbClient, BatchWriteItemCommand } from '../lib/dynamodb-service.js'
import { client as s3Client, PutObjectCommand } from '../lib/s3-service.js'

import { responses } from './morningstar_responses.js'
import testSeligsonDynamoStubCalls from './scraper_index.test.helpers.js'
chaiUse(sinonChai)

const BUCKET = 'dummy-bucket'
const TABLE = 'dummy-table'
const mockAgent = new MockAgent()

describe('Tests', () => {
  let dynamoStub, s3Stub, sandbox, clock

  before(async () => {
    sandbox = sinon.createSandbox()

    dynamoStub = sandbox.stub(dynamodbClient, 'send')
    s3Stub = sandbox.stub(s3Client, 'send')

    // 2018-08-03 13:04:56
    clock = sinon.useFakeTimers({
      now: 1533301496000,
      toFake: ['Date'],
      shouldAdvanceTime: false
    })

    dynamoStub.returns(Promise.resolve(undefined))

    s3Stub.returns(Promise.resolve(undefined))

    setGlobalDispatcher(mockAgent)
    mockAgent.disableNetConnect()
  })

  beforeEach(() => {
    const morningstarFiMocks = mockAgent.get('http://www.morningstar.fi')
    const morningstarHttpToolsMocks = mockAgent.get('http://tools.morningstar.fi')
    const morningstarHttpsToolsMocks = mockAgent.get('https://tools.morningstar.fi')
    const seligsonFiMocks = mockAgent.get('http://www.seligson.fi')

    morningstarFiMocks
      .intercept({ path: '/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0' })
      .reply(200, responses.etf)

    morningstarFiMocks
      .intercept({ path: '/fi/etf/snapshot/snapshot.aspx?id=0P0000HNXD' })
      .reply(200, responses.etf2)

    morningstarHttpToolsMocks
      .intercept({ path: '/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL' })
      .reply(200, responses.stock)

    morningstarHttpsToolsMocks
      .intercept({ path: '/fi/stockreport/default.aspx?Site=fi&id=0P0001NP95&LanguageId=fi-FI&SecurityToken=0P0001NP95]3]0]E0WWE%24%24ALL' })
      .reply(200, responses.stock2)

    morningstarFiMocks
      .intercept({ path: '/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP' })
      .reply(200, responses.fund)

    morningstarFiMocks
      .intercept({ path: '/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI' })
      .reply(200, responses.fund2)

    seligsonFiMocks
      .intercept({ path: '/graafit/rahamarkkina.csv' })
      .reply(200, responses.seligsonRahamarkkina)
  })

  afterEach(() => {
    sandbox.resetHistory()
  })

  after(async () => {
    sandbox.restore()
    clock.restore()
    await mockAgent.close()
    setGlobalDispatcher(new Agent())
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
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.stock.toString(),
      Bucket: BUCKET,
      Key: 'FI0009013403-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
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
    })))
  })

  it('stock2 (EDT timezone) processed correctly', async () => {
    const parsedData = await processIsin(
      BUCKET,
      TABLE,
      'US76954A1034'
    )

    expect(parsedData).to.deep.include({
      isin: 'US76954A1034',
      name: 'Rivian Automotive Inc',
      value: 46.44,
      valueDate: '2022-04-01T23:59:59Z' // HTML has 2022-04-01T19:59:59 EDT ==> 2022-04-01T23:59:59Z (since EDT = UTC-4)
    })
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.stock2.toString(),
      Bucket: BUCKET,
      Key: 'US76954A1034-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
      RequestItems: {
        'dummy-table': [
          {
            PutRequest: {
              Item: {
                isin: { S: 'US76954A1034' },
                value: { N: '46.44' },
                valueDate: { S: '2022-04-01T23:59:59Z' }
              }
            }
          }
        ]
      }
    })))
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
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.fund.toString(),
      Bucket: BUCKET,
      Key: 'NO0010140502-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
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
    })))
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
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.fund2.toString(),
      Bucket: BUCKET,
      Key: 'LU0839027447-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
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
    })))
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
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.seligsonRahamarkkina.toString(),
      Bucket: BUCKET,
      Key: 'FI0008801733-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
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
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.stock.toString(),
      Bucket: BUCKET,
      Key: 'FI0009013403-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
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
    })))

    // fund
    expect(s3Stub).to.have.been.calledWith(sinon.match.instanceOf(PutObjectCommand).and(sinon.match.has('input', {
      Body: responses.fund.toString(),
      Bucket: BUCKET,
      Key: 'NO0010140502-2018-08-03T130456Z',
      ServerSideEncryption: 'AES256'
    })))
    expect(dynamoStub).to.have.been.calledWith(sinon.match.instanceOf(BatchWriteItemCommand).and(sinon.match.has('input', {
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
    })))
  })
})
