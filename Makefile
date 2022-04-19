.DEFAULT_GOAL := install

install:
	yarn
	pip install poetry
	poetry install

