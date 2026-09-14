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

lint: ## Lint bot + dashboard (Vue/TS)
	$(NPM) run lint

fix: ## Auto-fix bot + dashboard (Vue/TS)
	$(NPM) run fix

test: ## Run Jest + Vue dashboard tests
	$(NPM) test
	$(NPM) run test --prefix .dashboard

test-watch: ## Run tests in watch mode
	$(NPM) run test:watch

test-coverage: ## Run Jest coverage + Vue dashboard tests
	$(NPM) run test:coverage
	$(NPM) run test --prefix .dashboard

test-dashboard: ## Run Vue dashboard component tests only (Vitest)
	$(NPM) run test --prefix .dashboard

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

## —— Docker 🐳 ————————————————————————————————————————————————————————————————
# Requires .env (cp .env.dist .env). Optional: FOXBOT_IMAGE_TAG=1.0.0
# Profiles: with-mongo (dev), dashboard → http://127.0.0.1:3847

DOCKER_COMPOSE ?= docker compose
DOCKER_PROFILES ?=

docker-up: ## Start bot (override: DOCKER_PROFILES="--profile with-mongo --profile dashboard")
	$(DOCKER_COMPOSE) $(DOCKER_PROFILES) up -d

docker-down: ## Stop all compose services (incl. mongo / dashboard profiles)
	$(DOCKER_COMPOSE) --profile with-mongo --profile dashboard down

docker-restart: ## Restart bot container
	$(DOCKER_COMPOSE) restart discord-bot

docker-pull: ## Pull image from GHCR
	$(DOCKER_COMPOSE) pull

docker-build: ## Build image locally and start
	$(DOCKER_COMPOSE) $(DOCKER_PROFILES) up -d --build

docker-logs: ## Tail bot logs
	$(DOCKER_COMPOSE) logs -f discord-bot

docker-ps: ## Show compose services status
	$(DOCKER_COMPOSE) --profile with-mongo --profile dashboard ps -a

docker-config: ## Validate compose + show resolved config
	$(DOCKER_COMPOSE) $(DOCKER_PROFILES) config

docker-mongo: ## Start bot + local Mongo (dev)
	$(DOCKER_COMPOSE) --profile with-mongo up -d

docker-dashboard: ## Start bot + local dashboard (127.0.0.1:3847)
	$(DOCKER_COMPOSE) --profile dashboard up -d

docker-shell: ## Shell into the running bot container
	$(DOCKER_COMPOSE) exec discord-bot sh

## —— MongoDB 🍃 ——————————————————————————————————————————————————————————————
# mongodump local, sinon docker run mongo:7. URI depuis MONGO_ENV_FILE (défaut .env.prod).

MONGO_ENV_FILE ?= .env.prod
MONGO_DUMP_DIR ?= var/mongo-dump

mongo-dump: ## Dump MONGODB_NAME → var/mongo-dump/<timestamp>/ (MONGO_ENV_FILE=.env.prod)
	@test -f "$(MONGO_ENV_FILE)" || { echo "Fichier env manquant: $(MONGO_ENV_FILE) (override: MONGO_ENV_FILE=.env)"; exit 1; }
	@MONGO_ENV_FILE="$(MONGO_ENV_FILE)" MONGO_DUMP_DIR="$(MONGO_DUMP_DIR)" node scripts/mongo-backup.js dump

mongo-restore: ## Restore last dump (or MONGO_RESTORE_DIR=…) into MONGODB_NAME
	@test -f "$(MONGO_ENV_FILE)" || { echo "Fichier env manquant: $(MONGO_ENV_FILE)"; exit 1; }
	@MONGO_ENV_FILE="$(MONGO_ENV_FILE)" MONGO_DUMP_DIR="$(MONGO_DUMP_DIR)" MONGO_RESTORE_DIR="$(MONGO_RESTORE_DIR)" \
		node scripts/mongo-backup.js restore

## —— Dashboard 📊 —————————————————————————————————————————————————————————————

DASHBOARD_PORT     ?= 3847
DASHBOARD_ENV_FILE ?= .env
DASHBOARD_PID      := .dashboard/var/dashboard.pid
DASHBOARD_ENV_MARK := .dashboard/var/dashboard.envfile
DASHBOARD_LOG      := .dashboard/var/logs/dashboard.log
DASHBOARD_URL      := http://127.0.0.1:$(DASHBOARD_PORT)

dashboard-start: ## Start stats dashboard (default: .env) — prod: DASHBOARD_ENV_FILE=.env.prod
	@if [ ! -x .dashboard/node_modules/.bin/vite ] || [ ! -x .dashboard/node_modules/.bin/vue-tsc ]; then \
		echo "Installing dashboard dependencies…"; \
		npm install --prefix .dashboard || exit 1; \
	fi
	@if [ ! -f .dashboard/dist/index.html ]; then \
		echo "Building dashboard frontend (dist/ missing)…"; \
		npm run build --prefix .dashboard || exit 1; \
	fi
	@if [ -f "$(DASHBOARD_PID)" ] && kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
		cur=$$(cat "$(DASHBOARD_ENV_MARK)" 2>/dev/null || echo ""); \
		if [ "$$cur" = "$(DASHBOARD_ENV_FILE)" ]; then \
			echo "Dashboard déjà démarré → $(DASHBOARD_URL) (env $(DASHBOARD_ENV_FILE), pid $$(cat $(DASHBOARD_PID)))"; \
			exit 0; \
		fi; \
		echo "Env changé ($$cur → $(DASHBOARD_ENV_FILE)), redémarrage…"; \
		$(MAKE) --no-print-directory dashboard-stop; \
	fi
	@mkdir -p .dashboard/var/logs; \
	DASHBOARD_PORT=$(DASHBOARD_PORT) DASHBOARD_ENV_FILE=$(DASHBOARD_ENV_FILE) \
		nohup node .dashboard/server.js > "$(DASHBOARD_LOG)" 2>&1 & echo $$! > "$(DASHBOARD_PID)"; \
	echo "$(DASHBOARD_ENV_FILE)" > "$(DASHBOARD_ENV_MARK)"; \
	i=0; \
	while [ $$i -lt 40 ]; do \
		if curl -sf "$(DASHBOARD_URL)/api/health" >/dev/null 2>&1; then \
			echo "Dashboard démarré → $(DASHBOARD_URL) (env $(DASHBOARD_ENV_FILE), pid $$(cat $(DASHBOARD_PID)))"; \
			exit 0; \
		fi; \
		if ! kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
			echo "Échec du démarrage — voir $(DASHBOARD_LOG)"; \
			rm -f "$(DASHBOARD_PID)" "$(DASHBOARD_ENV_MARK)"; \
			exit 1; \
		fi; \
		i=$$((i+1)); \
		sleep 0.25; \
	done; \
	echo "Dashboard démarré (encore en connexion) → $(DASHBOARD_URL) (env $(DASHBOARD_ENV_FILE), pid $$(cat $(DASHBOARD_PID)))"

dashboard-stop: ## Stop the local stats dashboard
	@stopped=0; \
	if [ -f "$(DASHBOARD_PID)" ]; then \
		pid=$$(cat "$(DASHBOARD_PID)"); \
		if kill -0 $$pid 2>/dev/null; then \
			kill $$pid 2>/dev/null || true; \
			sleep 0.2; \
			kill -0 $$pid 2>/dev/null && kill -9 $$pid 2>/dev/null || true; \
			echo "Dashboard arrêté (pid $$pid)"; \
			stopped=1; \
		else \
			echo "Processus déjà mort (pid $$pid)"; \
		fi; \
		rm -f "$(DASHBOARD_PID)" "$(DASHBOARD_ENV_MARK)"; \
	fi; \
	for pid in $$(pgrep -f 'node \.dashboard/server\.js' 2>/dev/null || true); do \
		kill $$pid 2>/dev/null || true; \
		sleep 0.1; \
		kill -0 $$pid 2>/dev/null && kill -9 $$pid 2>/dev/null || true; \
		echo "Dashboard orphelin arrêté (pid $$pid)"; \
		stopped=1; \
	done; \
	rm -f "$(DASHBOARD_PID)" "$(DASHBOARD_ENV_MARK)"; \
	if [ "$$stopped" = 0 ]; then echo "Dashboard non démarré"; fi

dashboard-restart: dashboard-stop dashboard-start ## Restart the local stats dashboard

dashboard-status: ## Show dashboard status
	@if [ -f "$(DASHBOARD_PID)" ] && kill -0 $$(cat "$(DASHBOARD_PID)") 2>/dev/null; then \
		envf=$$(cat "$(DASHBOARD_ENV_MARK)" 2>/dev/null || echo '?'); \
		echo "running  pid=$$(cat $(DASHBOARD_PID))  env=$$envf  $(DASHBOARD_URL)"; \
	elif pgrep -f 'node \.dashboard/server\.js' >/dev/null 2>&1; then \
		echo "orphan  pids=$$(pgrep -f 'node \.dashboard/server\.js' | tr '\n' ' ')  → make dashboard-restart"; \
	else \
		echo "stopped"; \
		rm -f "$(DASHBOARD_PID)" "$(DASHBOARD_ENV_MARK)"; \
	fi

dashboard-open: ## Open the dashboard in the browser (starts it if needed)
	@$(MAKE) --no-print-directory dashboard-start
	@xdg-open "$(DASHBOARD_URL)" >/dev/null 2>&1 || open "$(DASHBOARD_URL)" >/dev/null 2>&1 || echo "Ouvre $(DASHBOARD_URL)"

dashboard-logs: ## Tail dashboard logs
	@touch "$(DASHBOARD_LOG)"
	@tail -n 50 -f "$(DASHBOARD_LOG)"

