provider "aws" {
  region  = "eu-west-1"
  profile = "terraform"
}

resource "aws_lambda_function" "demo_lambda" {
  function_name    = "demo_lambda"
  handler          = "index.handler"
  runtime          = "nodejs8.10"
  filename         = ".serverless/finance_scraper.zip"
  source_code_hash = "${base64sha256(file(".serverless/finance_scraper.zip"))}"
  role             = "${aws_iam_role.lambda_exec_role.arn}"
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role"

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
      "Sid": ""
    }
  ]
}
EOF

  resource "aws_dynamodb_table" "finance_scraper" {
    name           = "finance_scraper"
    read_capacity  = 2
    write_capacity = 2
    hash_key       = "url"
    range_key      = "value_date"

    attribute {
      name = "url"
      type = "S"
    }

    attribute {
      name = "raw_html"
      type = "B"
    }

    attribute {
      name = "value_date"
      type = "S"
    }

    attribute {
      name = "value"
      type = "N"
    }
  }
}
