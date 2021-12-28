import { keycode } from "./deps.ts";

type KeyCode = keycode.KeyCode;

export async function* keypress(
  opts: { tty?: Deno.File; bufferSize?: number } = {},
): AsyncGenerator<KeyCode> {
  const buffer = new Uint8Array(opts.bufferSize || 256);
  const tty = opts.tty ?? Deno.stdin;
  try {
    while (true) {
      Deno.setRaw(tty.rid, true);
      const nread = await tty.read(buffer);
      Deno.setRaw(tty.rid, false);
      const keys = keycode.parse(nread ? buffer.subarray(0, nread) : buffer);
      for (const key of keys) {
        yield key;
      }
    }
  } finally {
    Deno.setRaw(tty.rid, false);
  }
}

export type { KeyCode };
