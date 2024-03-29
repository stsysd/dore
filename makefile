FLAGS := --allow-read --allow-write=/dev/tty --unstable

.PHONY: test run

test:
	deno test ${FLAGS}

check:
	deno lint
	deno fmt

run:
	deno run ${FLAGS} ./main.ts

example:
	deno run ${FLAGS} ./example.ts

install:
	deno install ${FLAGS} -n dore -f ./main.ts