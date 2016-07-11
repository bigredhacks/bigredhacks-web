
.PHONY: apigen config clean run

config:
	cp -n config.template.json config.json
	cp dev-tools/git/pre-push .git/hooks/pre-push
	npm install

clean:
	rm config.json

apigen:
	apidoc -i routes/ -o apidoc

run:
	node bin/www.js
