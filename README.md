# isel

isel is a command-line **I**nteractive **Sel**ector like
[peco](https://github.com/peco/peco) and [fzf](https://github.com/junegunn/fzf)
written by [deno](https://deno.land/).

## Installation

```console
deno install --allow-read --allow-write=/dev/tty --unstable -n isel https://raw.githubusercontent.com/stsysd/isel/v0.1.0/main.ts
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
