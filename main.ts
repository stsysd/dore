import { readLines } from "https://deno.land/std/io/mod.ts";
import {
  Arg,
  Command,
  Flag,
  Help,
  Name,
  Opt,
  Version,
} from "https://raw.githubusercontent.com/stsysd/classopt/v0.1.0/mod.ts";
import { select, selectMany } from "./mod.ts";
import meta from "./meta.json" assert { type: "json" };

function printError(msg: string) {
  console.error(`%c${msg}`, "color: red");
}

@Name(meta.name)
@Version(meta.version)
@Help("interactive selector")
class Program extends Command {
  @Arg({ name: "FILE", optional: true })
  file = "";

  @Opt({
    about: "parse input as ndjson, and show specified key",
    long: "json-key",
    short: true,
    multiple: true,
  })
  _jsonKeys: string[] = [];

  @Flag({ about: "select multiple item", short: "m" })
  multiselect = false;

  @Opt({ about: "specify prompt string" })
  prompt?: string;

  @Opt({ about: "initial value for query" })
  query?: string;

  get ndjson(): boolean {
    return this._jsonKeys.length > 0;
  }

  get jsonKeys(): string[] {
    return this.ndjson ? this._jsonKeys : ["value"];
  }

  async execute(): Promise<void> {
    const source = await this.loadSource();
    if (source.length === 0) {
      printError("ERROR: no choice");
      Deno.exit(1);
    }
    if (this.multiselect) {
      const selected = await selectMany(source, {
        show: (item) => this.showItem(item),
        prompt: this.prompt,
        query: this.query,
      });
      if (selected.length === 0) {
        printError("ERROR: cancelled");
        Deno.exit(1);
      }
      for (const item of selected) {
        if (this.ndjson) {
          console.log(JSON.stringify(item));
        } else {
          console.log(item.value);
        }
      }
    } else {
      const selected = await select(source, {
        show: (item) => this.showItem(item),
        prompt: this.prompt,
        query: this.query,
      });
      if (selected === null) {
        printError("ERROR: cancelled");
        Deno.exit(1);
      }
      if (this.ndjson) {
        console.log(JSON.stringify(selected));
      } else {
        console.log(selected.value);
      }
    }
  }

  async loadSource(): Promise<Record<string, unknown>[]> {
    const input = this.file ? await Deno.open(this.file) : Deno.stdin;
    if (Deno.isatty(input.rid)) {
      printError("ERROR: fail to setup source: input is tty");
      Deno.exit(1);
    }
    const lines = [];
    for await (const line of readLines(input)) {
      lines.push(line);
    }

    let source;
    if (this.ndjson) {
      source = lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          printError(
            `ERROR: cannot parse input ${JSON.stringify(line)} as JSON`,
          );
          Deno.exit(1);
        }
      });
      for (const item of source) {
        if (typeof item !== "object" || item === null) {
          printError(`ERROR: ${item} is not object`);
          Deno.exit(1);
        }
      }
    } else {
      source = lines.map((line) => ({ value: line }));
    }
    return source;
  }

  showItem(
    item: Record<string, unknown>,
  ): string[] {
    return this.jsonKeys.map((key) =>
      key.split(".").reduce(
        (v: Record<string, unknown>, key) => {
          if (!Object.hasOwn(v, key)) {
            printError(
              `ERROR: object ${JSON.stringify(item)} doesn't have key '${key}'`,
            );
            Deno.exit(1);
          }
          return v[key] as Record<string, unknown>;
        },
        item,
      )
    ).map((v) => `${v}`);
  }
}

await Program.run(Deno.args);
