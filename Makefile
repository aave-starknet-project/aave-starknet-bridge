.DEFAULT_GOAL := install

install:
	yarn
	npm install -g ganache
	python -m pip install -r requirements.txt

