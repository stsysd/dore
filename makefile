.PHONY: test run

test:
	deno test -A --unstable

run:
	deno run --allow-read --allow-write=/dev/tty --unstable ./main.ts
