import { colors, Disposable, StringWriter } from "./deps.ts";
import {
  clearBuffer,
  enterBuffer,
  exitBuffer,
  loadCurosr,
  moveCursor,
  saveCurosr,
} from "./screen.ts";
import { KeyCode, keypress } from "./keypress.ts";

export interface IConsole {
  write(p: Uint8Array): Promise<void>;
  size(): { columns: number; rows: number };
  keypress(): AsyncGenerator<KeyCode>;
}

export async function ttyConsole(): Promise<IConsole> {
  const tty = await Deno.open("/dev/tty", { read: true, write: true });
  return {
    async write(p: Uint8Array): Promise<void> {
      await tty.write(p);
    },
    size(): { columns: number; rows: number } {
      return Deno.consoleSize(tty.rid);
    },
    keypress(): AsyncGenerator<KeyCode> {
      return keypress({ tty });
    },
  };
}

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

type Entry<T> = { data: T; view: string };
export class InteractiveSelector<T> {
  private index = 0;
  private _input = "";
  private filtered: Entry<T>[];
  private signal: Disposable | null = null;

  constructor(
    private source: Entry<T>[],
    private console: IConsole,
  ) {
    this.filtered = this.source;
  }

  get input(): string {
    return this._input;
  }

  set input(str: string) {
    this._input = str;
    const words = this.input.split(" ");
    this.filtered = this.source.filter((e) =>
      words.every((w) => e.view.includes(w))
    );
  }

  get consoleSize(): { columns: number; rows: number } {
    return this.console.size();
  }

  async run(): Promise<T | null> {
    if (this.source.length === 0) {
      return null;
    }
    try {
      await this.console.write(enterBuffer());
      await this.print();
      await this.pollKeypress();
      return this.filtered[this.index]?.data ?? null;
    } finally {
      await this.console.write(exitBuffer());
      this.signal?.dispose();
    }
  }

  async print() {
    const w = new StringWriter();
    const { rows, columns } = this.consoleSize;
    w.writeSync(clearBuffer());
    w.writeSync(moveCursor(1, 1));
    w.writeSync(encode(truncate(`QUERY> ${this.input}`, columns)));
    w.writeSync(saveCurosr());
    for (
      const [line, i] of this.filtered
        .slice(0, rows - 1)
        .map((entry, i) => [truncate(entry.view, columns), i] as const)
    ) {
      w.writeSync(encode("\n"));
      if (i == this.index) {
        w.writeSync(encode(`${colors.bgMagenta(line || " ")}`));
      } else {
        w.writeSync(encode(`${line || " "}`));
      }
    }
    w.writeSync(loadCurosr());
    await this.console.write(encode(w.toString()));
  }

  async pollKeypress(): Promise<void> {
    for await (const key of this.console.keypress()) {
      if (key.ctrl) {
        switch (key.name) {
          case "c":
          case "x":
            this.index = -1;
            return;
          default:
            continue;
        }
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
      const { rows } = this.consoleSize;
      this.index = Math.min(this.filtered.length - 1, this.index);
      this.index = Math.min(rows - 1, this.index);
      this.index = Math.max(0, this.index);
      await this.print();
    }
  }
}
export async function select<T>(
  source: T[],
  opts: { show?(t: T): string } = {},
): Promise<T | null> {
  const dore = new InteractiveSelector(
    source.map((t) => ({ data: t, view: opts.show ? opts.show(t) : `${t}` })),
    await ttyConsole(),
  );
  return await dore.run();
}
