provider "aws" {
  region  = "eu-west-1"
  profile = "terraform"
}

resource "aws_lambda_function" "scraper_lambda" {
  function_name    = "scraper_lambda"
  handler          = "index.handler"
  runtime          = "nodejs8.10"
  filename         = ".serverless/finance_scraper.zip"
  source_code_hash = "${base64sha256(file(".serverless/finance_scraper.zip"))}"
  role             = "${aws_iam_role.scraper_role.arn}"
}

resource "aws_iam_role" "scraper_role" {
  name = "scraper_role"

  assume_role_policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": "AllowsLambdaToExecute"
      }
    ]
  }
EOF
}

resource "aws_iam_policy" "scraper_policy" {
    name        = "scraper_policy"
    description = "Policy for the scraper to access AWS services"
    policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
            "dynamodb:PutItem",
            "dynamodb:Scan",
            "dynamodb:Query"
        ],
        "Effect": "Allow",
        "Sid": "AllowsMinimalDynamodb",
        "Resource": "${aws_dynamodb_table.finance_scraper.arn}"
      },
      {
          "Action": [
              "s3:PutObject",
              "s3:ListBucket"
          ],
          "Resource": [
              "${aws_s3_bucket.scraper_bucket.arn}/*",
              "${aws_s3_bucket.scraper_bucket.arn}"
          ],
          "Effect": "Allow",
          "Sid": "AllowsMinimalS3"
      }
    ]
  }
EOF
}

resource "aws_iam_role_policy_attachment" "scraper-policy-attach" {
    role       = "${aws_iam_role.scraper_role.name}"
    policy_arn = "${aws_iam_policy.scraper_policy.arn}"
}

resource "aws_s3_bucket" "scraper_bucket" {
  bucket = "finance-scraper-bucket"
  acl = "private"
}

resource "aws_dynamodb_table" "finance_scraper" {
  name           = "finance_scraper"
  read_capacity  = 2
  write_capacity = 2
  hash_key       = "isin"
  range_key      = "value_date"

  attribute {
    name = "isin"
    type = "S"
  }

  attribute {
    name = "value_date"
    type = "S"
  }

  /* Will be introduced by the application
  *  attribute {
  *   name = "value"
  *   type = "N"
  *  }
  */
}
