# —— Inspired by ———————————————————————————————————————————————————————————————
# http://fabien.potencier.org/symfony4-best-practices.html
# https://speakerdeck.com/mykiwi/outils-pour-ameliorer-la-vie-des-developpeurs-symfony?slide=47
# https://blog.theodo.fr/2018/05/why-you-need-a-makefile-on-your-project/

# Setup ————————————————————————————————————————————————————————————————————————

# Executables
NPM           = npm

SSH_COMMAND := ssh -F /home/jordan/.ssh/config -p 822 nas-synology
REMOTE_PATH := /volume1/docker/foxbot

# Misc
.DEFAULT_GOAL = help
.PHONY       =  # Not needed here, but you can put your all your targets to be sure
                # there is no name conflict between your files and your targets.

## —— 🐝 The Symfony Makefile 🐝 ———————————————————————————————————
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

## —— Project 🚀  ————————————————————————————————————————————————————————
start: js-install js-start ## Start the project (Docker, assets build)

dev: dev js-install js-dev ## Start the project for development (Docker, assets build)

clean: # Clean
	rm -rf node_modules
	rm -rf yarn-error.log npm-debug.log

## —— Quality insurance ✨ ——————————————————————————————————————————————————————
check: lint test ## Run all coding standards checks and tests

lint: ## Lint files with eslint
	$(NPM) run lint

fix: ## Fix files with eslint
	$(NPM) run fix

test: ## Run tests
	$(NPM) test

test-watch: ## Run tests in watch mode
	$(NPM) run test:watch

test-coverage: ## Run tests with coverage
	$(NPM) run test:coverage

## —— NPM 🐱 / JavaScript —————————————————————————————————————————————————————
js-install:
	$(NPM) install

js-dev: js-install ## Rebuild assets for the dev env
	$(NPM) run dev

js-start: ## Build assets for production
	$(NPM) run start

## —— Deploy 🚀 ————————————————————————————————————————————————————————————————

deploy-prod: ## Deploy on production
	$(SSH_COMMAND) "cd $(REMOTE_PATH) && git fetch && git pull origin main && git reset --hard HEAD && /usr/local/bin/docker container restart foxbot"

## —— Newsletter 📰 ————————————————————————————————————————————————————————————

newsletter-publish: ## Publish data/newsletter.md to all subscribed Discord channels
	node scripts/publish-newsletter.js

# Supports: make newsletter publish
ifeq ($(firstword $(MAKECMDGOALS)),newsletter)
ifeq ($(word 2,$(MAKECMDGOALS)),publish)
newsletter: newsletter-publish
publish:
	@:
endif
endif
