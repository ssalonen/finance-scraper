'use strict'

import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'

export const client = new DynamoDBClient({})
export { QueryCommand, BatchWriteItemCommand }
