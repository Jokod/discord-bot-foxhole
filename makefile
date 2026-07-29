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

## —— Dashboard 📊 —————————————————————————————————————————————————————————————

DASHBOARD_PORT     ?= 3847
DASHBOARD_ENV_FILE ?= .env.prod
DASHBOARD_PID      := .dashboard/dashboard.pid
DASHBOARD_LOG      := .dashboard/dashboard.log
DASHBOARD_URL      := http://127.0.0.1:$(DASHBOARD_PORT)

dashboard-start: ## Start stats dashboard on prod Mongo (.env.prod) — override: ENV_FILE=.env
	@if [ -f "$(DASHBOARD_PID)" ] && kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
		echo "Dashboard déjà démarré → $(DASHBOARD_URL) (pid $$(cat $(DASHBOARD_PID)))"; \
	else \
		DASHBOARD_PORT=$(DASHBOARD_PORT) DASHBOARD_ENV_FILE=$(DASHBOARD_ENV_FILE) \
			nohup node .dashboard/server.js > "$(DASHBOARD_LOG)" 2>&1 & echo $$! > "$(DASHBOARD_PID)"; \
		i=0; \
		while [ $$i -lt 40 ]; do \
			if curl -sf "$(DASHBOARD_URL)/api/summary" >/dev/null 2>&1; then \
				echo "Dashboard démarré → $(DASHBOARD_URL) (env $(DASHBOARD_ENV_FILE), pid $$(cat $(DASHBOARD_PID)))"; \
				exit 0; \
			fi; \
			if ! kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
				echo "Échec du démarrage — voir $(DASHBOARD_LOG)"; \
				rm -f "$(DASHBOARD_PID)"; \
				exit 1; \
			fi; \
			i=$$((i+1)); \
			sleep 0.25; \
		done; \
		echo "Dashboard démarré (encore en connexion) → $(DASHBOARD_URL) (pid $$(cat $(DASHBOARD_PID)))"; \
	fi

dashboard-stop: ## Stop the local stats dashboard
	@if [ -f "$(DASHBOARD_PID)" ]; then \
		pid=$$(cat "$(DASHBOARD_PID)"); \
		if kill -0 $$pid 2>/dev/null; then \
			kill $$pid && echo "Dashboard arrêté (pid $$pid)"; \
		else \
			echo "Processus déjà mort (pid $$pid)"; \
		fi; \
		rm -f "$(DASHBOARD_PID)"; \
	else \
		echo "Dashboard non démarré"; \
	fi

dashboard-restart: dashboard-stop dashboard-start ## Restart the local stats dashboard

dashboard-status: ## Show dashboard status
	@if [ -f "$(DASHBOARD_PID)" ] && kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
		echo "running  pid=$$(cat $(DASHBOARD_PID))  $(DASHBOARD_URL)"; \
	else \
		echo "stopped"; \
		rm -f "$(DASHBOARD_PID)"; \
	fi

dashboard-open: ## Open the dashboard in the browser (starts it if needed)
	@$(MAKE) --no-print-directory dashboard-start
	@xdg-open "$(DASHBOARD_URL)" >/dev/null 2>&1 || open "$(DASHBOARD_URL)" >/dev/null 2>&1 || echo "Ouvre $(DASHBOARD_URL)"

dashboard-logs: ## Tail dashboard logs
	@touch "$(DASHBOARD_LOG)"
	@tail -n 50 -f "$(DASHBOARD_LOG)"

