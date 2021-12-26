import { colors, Disposable, Fuse, signal, StringWriter } from "./deps.ts";
import {
  clearBuffer,
  enterBuffer,
  exitBuffer,
  loadCurosr,
  moveCursor,
  saveCurosr,
} from "./screen.ts";
import { KeyCode, keypress } from "./keypress.ts";

const encoder = new TextEncoder();
function encode(str: string): Uint8Array {
  return encoder.encode(str);
}

function truncate(str: string, width: number): string {
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      w += 2;
    } else {
      w += 1;
    }
    if (w > width) {
      return str.slice(0, i - 1);
    }
  }
  return str;
}

export class InteractiveSelector {
  private fuse: Fuse<{ text: string }>;
  private index = 0;
  private _input = "";
  private filtered: string[];
  private signal: Disposable | null = null;

  constructor(
    private source: string[],
    private out: Deno.Writer & { readonly rid: number } = Deno.stdout
  ) {
    this.fuse = new Fuse(
      source.map((text) => ({ text })),
      {
        shouldSort: false,
        ignoreLocation: true,
        threshold: 0.0,
        keys: ["text"],
      }
    );
    this.filtered = this.source;
  }

  get input(): string {
    return this._input;
  }

  set input(str: string) {
    this._input = str;
    const words = this.input.split(" ");
    const patterns = words.filter(Boolean).map((text) => ({ text }));
    if (patterns.length === 0) {
      this.filtered = this.source;
    }
    this.filtered = this.fuse
      .search({ $and: patterns })
      .map((r) => r.item.text);
  }

  async run(keys: AsyncGenerator<KeyCode>): Promise<string | null> {
    try {
      await this.out.write(enterBuffer());
      await this.print();
      await Promise.race([this.pollKeypress(keys), this.pollSignal()]);
      return this.filtered[this.index] ?? null;
    } finally {
      await this.out.write(exitBuffer());
      this.signal?.dispose();
    }
  }

  async print() {
    const w = new StringWriter();
    const { rows, columns } = Deno.consoleSize(this.out.rid);
    w.writeSync(clearBuffer());
    w.writeSync(moveCursor(1, 1));
    w.writeSync(encode(truncate(`QUERY> ${this.input}`, columns)));
    w.writeSync(saveCurosr());
    for (const [line, i] of this.filtered
      .slice(0, rows - 1)
      .map((line, i) => [truncate(line, columns), i] as const)) {
      w.writeSync(encode("\n"));
      if (i == this.index) {
        w.writeSync(encode(`${colors.bgMagenta(line || " ")}`));
      } else {
        w.writeSync(encode(`${line || " "}`));
      }
    }
    w.writeSync(loadCurosr());
    await this.out.write(encode(w.toString()));
  }

  async pollKeypress(keys: AsyncGenerator<KeyCode>): Promise<void> {
    for await (const key of keys) {
      if (key.ctrl) {
        if (key.name === "c") throw "abort by ctrl-c";
        continue;
      }
      switch (key.name) {
        case "backspace":
          this.input = this.input.slice(0, -1);
          break;
        case "return":
        case "enter":
          return;
        case "up":
          this.index -= 1;
          this.index = Math.max(0, this.index);
          break;
        case "down":
          this.index += 1;
          this.index = Math.min(this.filtered.length - 1, this.index);
          break;
        default:
          if (key.code) break;
          this.input += key.sequence ?? "";
          break;
      }
      const { rows } = Deno.consoleSize(this.out.rid);
      this.index = Math.min(this.filtered.length - 1, this.index);
      this.index = Math.min(rows - 1, this.index);
      this.index = Math.max(0, this.index);
      await this.print();
    }
  }

  async pollSignal(): Promise<void> {
    const sig = signal("SIGWINCH");
    this.signal = sig;
    for await (const _ of sig) {
      const { rows } = Deno.consoleSize(this.out.rid);
      this.index = Math.min(rows - 1, this.index);
      await this.print();
    }
  }
}

export async function interactiveSelection(
  source: string[]
): Promise<string | null> {
  const isel = new InteractiveSelector(source);
  const tty = await Deno.open("/dev/tty");
  return await isel.run(keypress({ tty }));
}
