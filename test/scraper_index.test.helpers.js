function testSeligsonDynamoStubCalls (expect, dynamoStub) {
  // Call 1
  expect(dynamoStub).to.have.been.calledWith({
    RequestItems: {
      'dummy-table': [{
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5121' },
            valueDate: { S: '2018-06-08T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5121' },
            valueDate: { S: '2018-06-11T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-12T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-13T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-14T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-15T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-18T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-19T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.512' },
            valueDate: { S: '2018-06-20T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5119' },
            valueDate: { S: '2018-06-21T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5119' },
            valueDate: { S: '2018-06-25T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5119' },
            valueDate: { S: '2018-06-26T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5119' },
            valueDate: { S: '2018-06-27T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5119' },
            valueDate: { S: '2018-06-28T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-06-29T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-07-02T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-07-03T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-07-04T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-07-05T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5118' },
            valueDate: { S: '2018-07-06T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5117' },
            valueDate: { S: '2018-07-09T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5117' },
            valueDate: { S: '2018-07-10T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5117' },
            valueDate: { S: '2018-07-11T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5117' },
            valueDate: { S: '2018-07-12T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5117' },
            valueDate: { S: '2018-07-13T12:00:00Z' }
          }
        }
      }]
    }
  })
  // Call 2:
  expect(dynamoStub).to.have.been.calledWith({
    RequestItems: {
      'dummy-table': [{
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5116' },
            valueDate: { S: '2018-07-16T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5116' },
            valueDate: { S: '2018-07-17T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5116' },
            valueDate: { S: '2018-07-18T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5116' },
            valueDate: { S: '2018-07-19T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5116' },
            valueDate: { S: '2018-07-20T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5115' },
            valueDate: { S: '2018-07-23T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5115' },
            valueDate: { S: '2018-07-24T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5115' },
            valueDate: { S: '2018-07-25T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5115' },
            valueDate: { S: '2018-07-26T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5115' },
            valueDate: { S: '2018-07-27T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5114' },
            valueDate: { S: '2018-07-30T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5114' },
            valueDate: { S: '2018-07-31T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5114' },
            valueDate: { S: '2018-08-01T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5114' },
            valueDate: { S: '2018-08-02T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5114' },
            valueDate: { S: '2018-08-03T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5113' },
            valueDate: { S: '2018-08-06T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5113' },
            valueDate: { S: '2018-08-07T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5113' },
            valueDate: { S: '2018-08-08T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5113' },
            valueDate: { S: '2018-08-09T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5113' },
            valueDate: { S: '2018-08-10T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5112' },
            valueDate: { S: '2018-08-13T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5112' },
            valueDate: { S: '2018-08-14T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5112' },
            valueDate: { S: '2018-08-15T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5112' },
            valueDate: { S: '2018-08-16T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-17T12:00:00Z' }
          }
        }
      }]
    }
  })
  // Call 3
  expect(dynamoStub).to.have.been.calledWith({
    RequestItems: {
      'dummy-table': [{
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-20T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-21T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-22T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-23T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.5111' },
            valueDate: { S: '2018-08-24T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.511' },
            valueDate: { S: '2018-08-27T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.511' },
            valueDate: { S: '2018-08-28T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.511' },
            valueDate: { S: '2018-08-29T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.511' },
            valueDate: { S: '2018-08-30T12:00:00Z' }
          }
        }
      }, {
        PutRequest: {
          Item: {
            isin: { S: 'FI0008801733' },
            value: { N: '2.511' },
            valueDate: { S: '2018-08-31T12:00:00Z' }
          }
        }
      }]
    }
  })
}

exports.testSeligsonDynamoStubCalls = testSeligsonDynamoStubCalls
