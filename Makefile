
.PHONY: clean package invoke_scraper plan deploy test test-watch clean help
.DEFAULT_GOAL := help

package:
	npm run package

# invoke_local:
#	 export AWS_PROFILE=terraform ; cat scraper_example.json | serverless invoke local -f scraper

invoke_scraper:
	rm out.txt | true
	aws lambda invoke --region eu-west-1 --function-name scraper_lambda --payload file://./scraper_example.json --profile terraform out.txt
	cat out.txt
NODE_INVOKE_LOCAL_SCRAPER_SCRIPT=" \
fs = require('fs'); \
func = require('./lib/scraper_index'); \
event = JSON.parse(fs.readFileSync('./scraper_example.json')); \
func.handler(event).then(resp => { \
	console.log('statusCode:' + resp.statusCode); \
	console.log('response:\n' + JSON.stringify(JSON.parse(resp.body), null, ' ')); \
})"
invoke_local_scraper:
	AWS_REGION=eu-west-1 AWS_PROFILE=terraform node -e ${NODE_INVOKE_LOCAL_SCRAPER_SCRIPT}

invoke_history_api:
	rm out.txt | true
	aws lambda invoke --region eu-west-1 --function-name scraper_api_lambda --payload file://./api_example.json --profile terraform out.txt
	cat out.txt|jq .statusCode
	cat out.txt|jq  --sort-keys ' .body|fromjson '

NODE_INVOKE_LOCAL_API_SCRIPT=" \
fs = require('fs'); \
func = require('./lib/api_index'); \
event = JSON.parse(fs.readFileSync('./api_example.json')); \
func.handler(event).then(resp => { \
	console.log('statusCode:' + resp.statusCode); \
	console.log('response:\n' + JSON.stringify(JSON.parse(resp.body), null, ' ')); \
})"
invoke_local_history_api:
	AWS_REGION=eu-west-1 AWS_PROFILE=terraform node -e ${NODE_INVOKE_LOCAL_API_SCRIPT}

plan:
	AWS_REGION=eu-west-1 AWS_PROFILE=terraform terraform plan

deploy:
	AWS_REGION=eu-west-1 AWS_PROFILE=terraform terraform apply

test:
	npm run test

test-watch:
	npm run test-w

reprocess:
	AWS_REGION=eu-west-1 AWS_PROFILE=terraform npm run reprocess

clean:
	rm -rf build
	mkdir build

help:
	@echo "Suitable make targets:"
	@echo -n " "
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs
	@echo
	@echo "To build, deploy and test using the real instance:"
	@echo " make package; make deploy; make invoke_scraper"
	@echo
	@echo "To run tests:"
	@echo " make test"
	@echo " # or, to re-run the tests when files are modified"
	@echo " make test-watch"
