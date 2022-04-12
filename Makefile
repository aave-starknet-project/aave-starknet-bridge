.DEFAULT_GOAL := install

install:
	yarn
	python -m pip install -r requirements.txt

