
resource "aws_lambda_function" "scraper_lambda" {
  function_name    = "scraper_lambda"
  handler          = "lib/scraper_index.handler"
  runtime          = "nodejs8.10"
  filename         = ".serverless/finance_scraper.zip"
  source_code_hash = "${base64sha256(file(".serverless/finance_scraper.zip"))}"
  role             = "${aws_iam_role.scraper_role.arn}"
  timeout          = "120"
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
            "dynamodb:BatchWriteItem",
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

resource "aws_cloudwatch_event_rule" "scrape_every_8_hours" {
  name = "scrape_every_8_hours"
  schedule_expression = "rate(8 hour)"
  description = "Call finance scraper every 8 hours"
}


resource "aws_cloudwatch_event_target" "scraper_cloudwatch_target" {
  rule = "${aws_cloudwatch_event_rule.scrape_every_8_hours.name}"
  arn = "${aws_lambda_function.scraper_lambda.arn}"
  input = <<DOC
{
  "isins": [
    "FI0009013403",
    "FI0008801733"
  ]
}
DOC
}

resource "aws_lambda_permission" "allow_cloudwatch_to_execute_scraper" {
  statement_id   = "AllowExecutionFromCloudWatch"
  action         = "lambda:InvokeFunction"
  function_name  = "${aws_lambda_function.scraper_lambda.function_name}"
  principal      = "events.amazonaws.com"
  source_arn     = "${aws_cloudwatch_event_rule.scrape_every_8_hours.arn}"
}
# TODO: Consider Cloudwatch events -> SQS queue -> scraper lambda
# 404 and 500 would fail, and be retried!?


/*
const ISIN_TO_PARSER_AND_URL_AND_NAME = {
  NORMAL CYCLE:

  LU0839027447: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000Y5NI', 'db x-trackers Nikkei 225 UCITS ETF (DR) 1D (EUR) XDJP (Frankfurt)'],
  NO0010140502: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=0P0000GGNP', 'SKAGEN Kon-Tiki A (EUR)'],
  SE0005991445: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000UF2B', 'Handelsbanken Euro Obligaatio (A1 EUR)'],
  FI0008803812: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04O7X', 'PYN Elite Fund'],
  IE00B52MJY50: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000RTOH', 'Aasia ilman Japania iShares Core MSCI Pacific ex Japan UCITS ETF EUR SXR1 F Kasvu'],
  IE00B4L5Y983: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000MEI0', 'iShares Core MSCI World UCITS ETF'],
  SE0005993102: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F00000TH8W', 'Nordnet Superrahasto Suomi'],
  FI0008800321: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/funds/snapshot/snapshot.aspx?id=F0GBR04OGI', 'FIM Euro'],
  LU0274211480: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000M7ZP', 'Saksa db x-trackers DAX UCITS ETF EUR DBXD F Kasvu'],
  LU0380865021: [morningStarEtfOrFundParser, 'http://www.morningstar.fi/fi/etf/snapshot/snapshot.aspx?id=0P0000HNXD', 'db x-trackers Euro Stoxx 50 UCITS ETF (DR) 1C (EUR) DXET'],
  FI0009013403: [morningStarStockParser, 'http://tools.morningstar.fi/fi/stockreport/default.aspx?SecurityToken=0P0000A5Z8]3]0]E0WWE$$ALL', 'Kone Corporation']

  DAILY:

  FI0008801980: [twoMonthSeligsonParser, 'https://www.seligson.fi/graafit/global-pharma.csv', 'Seligson & Co Global Top 25 Pharmaceuticals A'],
  FI0008801733: [twoMonthSeligsonParser, 'http://www.seligson.fi/graafit/rahamarkkina.csv', 'Seligson & Co Rahamarkkinarahasto AAA A'],
  FI0008801790: [twoMonthSeligsonParser, 'https://www.seligson.fi/graafit/global-brands.csv', 'Seligson & Co Global Top 25 Brands Fund (A)'],

}
*/
