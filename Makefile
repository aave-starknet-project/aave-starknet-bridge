.DEFAULT_GOAL := install

install:
	yarn
	npm install -g ganache@7.0.4
	python -m pip install -r requirements.txt

