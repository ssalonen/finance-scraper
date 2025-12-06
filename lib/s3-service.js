'use strict'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const client = new S3Client({})
export { PutObjectCommand }
