# —— Inspired by ———————————————————————————————————————————————————————————————
# http://fabien.potencier.org/symfony4-best-practices.html
# https://speakerdeck.com/mykiwi/outils-pour-ameliorer-la-vie-des-developpeurs-symfony?slide=47
# https://blog.theodo.fr/2018/05/why-you-need-a-makefile-on-your-project/

# Setup ————————————————————————————————————————————————————————————————————————

# Executables
NPM           = npm
DOCKER		  = docker

SSH_COMMAND := ssh -F /home/jordan/.ssh/config -p 822 nas-synology
REMOTE_PATH := /var/services/web/foxbot

# Misc
.DEFAULT_GOAL = help
.PHONY       =  # Not needed here, but you can put your all your targets to be sure
                # there is no name conflict between your files and your targets.

## —— 🐝 The Symfony Makefile 🐝 ———————————————————————————————————
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

## —— Project 🚀  ————————————————————————————————————————————————————————
start: docker-up js-install js-start ## Start the project (Docker, assets build)

dev: docker-up dev js-install js-dev ## Start the project for development (Docker, assets build)

stop: docker-stop  ## Stop the project (Docker, assets build)

restart: stop start ## Restart the project (Docker, assets build)

clean: stop # Remove Docker container
	$(DOCKER) compose down --remove-orphans
	rm -rf node_modules
	rm -rf yarn-error.log npm-debug.log

info:
	@echo ============================================================================
	@echo PhpMyAdmin UI - Manage/View MySql datas     :     http://127.0.0.1:3004
	@echo ============================================================================

## —— Docker 🐳 ————————————————————————————————————————————————————————————————
docker-up: ## Start the docker hub
	$(DOCKER) compose up -d

docker-stop: ## Stop the docker hub
	$(DOCKER) compose stop

docker-build: ## Build the docker hub
	$(DOCKER) compose build

## —— Quality insurance ✨ ——————————————————————————————————————————————————————
check: lint ## Run all coding standards checks

lint: ## Lint files with php-cs-fixer
	$(NPM) run lint --dry-run

fix: ## Fix files with php-cs-fixer
	$(NPM) run fix

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
