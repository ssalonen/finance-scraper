terraform {
  backend "s3" {
    encrypt        = true
    bucket         = "YOUR-BUCKET-NAME-finance-scraper-terraform-remote-state-storage-s3"  # REPLACE WITH YOUR ACTUAL BUCKET NAME
    dynamodb_table = "terraform-state-lock-dynamo"
    region         = "eu-west-1"
    key            = "terraform-finance-scraper-state"
  }
}

provider "aws" {
  region  = "eu-west-1"
  profile = "terraform"
}

resource "aws_s3_bucket" "scraper_bucket" {
  bucket = "YOUR-UNIQUE-BUCKET-NAME-finance-scraper"  # REPLACE WITH YOUR ACTUAL BUCKET NAME (must be globally unique)
}

resource "aws_s3_bucket_acl" "scraper_s3_bucket_acl" {
  bucket = aws_s3_bucket.scraper_bucket.id
  acl    = "private"
}

resource "aws_dynamodb_table" "finance_scraper" {
  name           = "finance_scraper"
  read_capacity  = 2
  write_capacity = 2
  hash_key       = "isin"
  range_key      = "valueDate"

  attribute {
    name = "isin"
    type = "S"
  }

  attribute {
    name = "valueDate"
    type = "S"
  }
  /* Will be introduced by the application
  *  attribute {
  *   name = "value"
  *   type = "N"
  *  }
  */
}

