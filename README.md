# isel

isel is a command-line **I**nteractive **Sel**ector like
[peco](https://github.com/peco/peco) and [fzf](https://github.com/junegunn/fzf)
written by [deno](https://deno.land/).

## Installation

```console
deno install --allow-read --allow-write=/dev/tty --unstable -n isel https://raw.githubusercontent.com/stsysd/isel/v0.1.1/main.ts
```

## Usage

isel is a interactive selector, read the source list from STDIN or a file, and
write the selected item to STDOUT.

```console
# from STDIN
$ find * -type f | isel > selected

# from file
$ isel src.txt > selected
```

## As library

isel can be used as library.

```typescript
import { interactiveSelection } from "https://raw.githubusercontent.com/stsysd/isel/v0.1.1/mod.ts";

const selected = await interactiveSelection(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
```
