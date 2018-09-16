
resource "aws_iam_role_policy_attachment" "scraper-policy-attach" {
    role       = "${aws_iam_role.scraper_role.name}"
    policy_arn = "${aws_iam_policy.scraper_policy.arn}"
}

resource "aws_lambda_function" "scraper_api_lambda" {
  function_name    = "scraper_api_lambda"
  handler          = "lib/api_index.handler"
  runtime          = "nodejs8.10"
  filename         = ".serverless/finance_scraper.zip"
  source_code_hash = "${base64sha256(file(".serverless/finance_scraper.zip"))}"
  role             = "${aws_iam_role.scraper_api_role.arn}"
  timeout          = "120"
}

resource "aws_iam_role" "scraper_api_role" {
  name = "scraper_api_role"

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

resource "aws_iam_policy" "scraper_api_policy" {
    name        = "scraper_api_policy"
    description = "Policy for the scraper API to access AWS services"
    policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
            "dynamodb:Scan",
            "dynamodb:Query"
        ],
        "Effect": "Allow",
        "Sid": "AllowsMinimalDynamodbRead",
        "Resource": "${aws_dynamodb_table.finance_scraper.arn}"
      },
      {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow",
      "Sid": "AllowLogToCloudWatch"
    }
    ]
  }
EOF
}

resource "aws_iam_role_policy_attachment" "scraper-api-policy-attach" {
    role       = "${aws_iam_role.scraper_api_role.name}"
    policy_arn = "${aws_iam_policy.scraper_api_policy.arn}"
}

