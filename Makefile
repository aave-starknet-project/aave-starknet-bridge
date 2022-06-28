.DEFAULT_GOAL := install

install:
	yarn install --frozen-lockfile
	pip install poetry
	poetry install
