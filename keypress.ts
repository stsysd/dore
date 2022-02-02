import { keycode } from "./deps.ts";

type KeyCode = keycode.KeyCode;

export async function* keypress(
  opts: { tty?: Deno.File } = {},
): AsyncGenerator<KeyCode> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(8);
  const tty = opts.tty ?? Deno.stdin;
  try {
    while (true) {
      Deno.setRaw(tty.rid, true, { cbreak: false });
      const nread = await tty.read(buffer);
      Deno.setRaw(tty.rid, false);
      const str = decoder.decode(nread ? buffer.subarray(0, nread) : buffer, {
        stream: true,
      });
      const keys = keycode.parse(str);
      for (const key of keys) {
        yield key;
      }
    }
  } finally {
    Deno.setRaw(tty.rid, false);
  }
}

export type { KeyCode };
