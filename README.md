# dore

dore is a command-line interactive selector like
[peco](https://github.com/peco/peco) and [fzf](https://github.com/junegunn/fzf)
written by [deno](https://deno.land/).

## Installation

```console
deno install --allow-read --allow-write=/dev/tty --unstable -n dore https://raw.githubusercontent.com/stsysd/dore/v0.4.7/main.ts
```

## Usage

dore is a interactive selector, read the source list from STDIN or a file, and
write the selected item to STDOUT.

```console
# from STDIN
$ find * -type f | dore > selected

# from file
$ dore src.txt > selected
```

## As library

dore can be used as library.

```typescript
import { select } from "https://raw.githubusercontent.com/stsysd/dore/v0.4.7/mod.ts";

const selected = await select(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
```
