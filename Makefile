.DEFAULT_GOAL := install

install:
	yarn
	pip install poetry
	poetry cache clear . --all
	poetry install
