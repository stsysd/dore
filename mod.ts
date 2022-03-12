import { colors, stringWidth, StringWriter, truncate } from "./deps.ts";
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

type Entry<T> = { data: T; view: string };

export class InteractiveSelector<T> {
  private index = 0;
  private input;
  private filtered: Entry<T>[];
  private multiselect: boolean;
  private marks: Set<number> = new Set();
  private prompt: string;

  constructor(
    private source: Entry<T>[],
    private console: IConsole,
    opts: {
      multiselect?: boolean;
      prompt?: string;
      console?: IConsole;
      query?: string;
    } = {},
  ) {
    this.filtered = this.source;
    this.multiselect = opts.multiselect ?? false;
    this.prompt = opts.prompt ?? "QUERY";
    this.input = opts.query ?? "";
  }

  updateInput(str: string) {
    this.input = str;
    const words = this.input.split(" ");
    this.marks = new Set();
    this.filtered = this.source.filter((e) =>
      words.every((w) => e.view.includes(w))
    );
  }

  async run(): Promise<T[]> {
    if (this.source.length === 0) {
      return [];
    }
    try {
      await this.console.write(enterBuffer());
      await this.print();
      await this.pollKeypress();
      return [...this.marks].map((ix) => this.filtered[ix].data);
    } finally {
      await this.console.write(exitBuffer());
    }
  }

  async print() {
    const w = new StringWriter();
    const { rows, columns } = this.console.size();
    const pageSize = rows - 1;
    const pageNum = Math.floor(this.index / pageSize);
    w.writeSync(clearBuffer());
    w.writeSync(moveCursor(1, 1));
    w.writeSync(encode(truncate(`${this.prompt}> ${this.input}`, columns)));
    w.writeSync(saveCurosr());
    for (
      const [line, i] of this.filtered
        .slice(pageSize * pageNum, pageSize * (pageNum + 1))
        .map((entry, i) =>
          [truncate(entry.view, columns), i + pageSize * pageNum] as const
        )
    ) {
      w.writeSync(encode("\n"));
      if (i === this.index) {
        w.writeSync(encode(`${colors.bgMagenta(line || " ")}`));
      } else if (this.marks.has(i)) {
        w.writeSync(encode(`${colors.bgCyan(line || " ")}`));
      } else {
        w.writeSync(encode(`${line || " "}`));
      }
    }
    w.writeSync(loadCurosr());
    await this.console.write(encode(w.toString()));
  }

  async pollKeypress(): Promise<void> {
    const { rows } = this.console.size();
    for await (const key of this.console.keypress()) {
      if (key.ctrl) {
        switch (key.name) {
          case "c":
            this.marks = new Set();
            return;
          case "space":
          case "`":
            if (!this.multiselect) break;
            if (this.marks.has(this.index)) {
              this.marks.delete(this.index);
            } else {
              this.marks.add(this.index);
            }
            this.index += 1;
            break;
          default:
            // pass
            break;
        }
      } else {
        switch (key.name) {
          case "escape":
            this.marks = new Set();
            return;
          case "backspace":
            this.updateInput(this.input.slice(0, -1));
            break;
          case "return":
          case "enter":
            if (this.filtered.length && this.marks.size === 0) {
              this.marks.add(this.index);
            }
            return;
          case "up":
            this.index -= 1;
            break;
          case "down":
            this.index += 1;
            break;
          case "left":
            this.index -= rows - 1;
            break;
          case "right":
            this.index += rows - 1;
            break;
          case "space":
            this.updateInput(this.input + " ");
            break;
          default:
            if (key.code) break;
            if (!key.sequence) break;
            this.updateInput(this.input + key.sequence);
            break;
        }
      }
      this.index = Math.min(this.filtered.length - 1, this.index);
      this.index = Math.max(0, this.index);
      await this.print();
    }
  }
}

type ShowFn<T> =
  | ((t: T) => string)
  | ((t: T) => string[]);

function padding(s: string, width: number): string {
  const w = stringWidth(s);
  return `${s}${" ".repeat(width - w)}`;
}

function alignView(piecesList: string[][]): string[] {
  const n = Math.max(...piecesList.map((ls) => ls.length));
  const layout = [...Array(n - 1)].map((_, i) =>
    Math.max(...piecesList.map((pieces) => stringWidth(pieces[i])))
  );
  return piecesList.map((pieces) =>
    pieces.map((p, i) => layout[i] ? padding(p, layout[i]) : p)
      .join(" ")
  );
}

export async function select<T>(
  source: T[],
  opts: { show?: ShowFn<T>; prompt?: string; query?: string } = {},
): Promise<T | null> {
  const views = alignView(
    source.map((t) => [opts.show ? opts.show(t) : `${t}`].flat()),
  );
  const dore = new InteractiveSelector(
    source.map((t, i) => ({ data: t, view: views[i] })),
    await ttyConsole(),
    { multiselect: false, prompt: opts.prompt, query: opts.query },
  );
  const ret = await dore.run();
  return ret[0] ?? null;
}

export async function selectMany<T>(
  source: T[],
  opts: { show?: ShowFn<T>; prompt?: string; query?: string } = {},
): Promise<T[]> {
  const views = alignView(
    source.map((t) => [opts.show ? opts.show(t) : `${t}`].flat()),
  );
  const dore = new InteractiveSelector(
    source.map((t, i) => ({ data: t, view: views[i] })),
    await ttyConsole(),
    { multiselect: true, prompt: opts.prompt, query: opts.query },
  );
  return await dore.run();
}
