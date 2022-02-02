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
import info from "./info.json" assert { type: "json" };

function printError(msg: string) {
  console.error(`%c${msg}`, "color: red");
}
@Name(info.name)
@Version(info.version)
@Help("interactive selector")
class Program extends Command {
  @Arg({ name: "FILE", optional: true })
  file = "";

  @Opt({ about: "parse input as ndjson, and show specified key", short: true })
  jsonKey = "";

  @Flag({ about: "select multiple item", short: "m" })
  multiselect = false;

  ndjson = false;

  async execute(): Promise<void> {
    this.ndjson = !!this.jsonKey;
    const source = await this.loadSource();
    if (source.length === 0) {
      printError("ERROR: no choice");
      Deno.exit(1);
    }
    if (this.multiselect) {
      const selected = await selectMany(
        source,
        { show: (item) => `${item[this.jsonKey]}` },
      );
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
        show: (item) => `${item[this.jsonKey]}`,
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
    if (this.jsonKey) {
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
        if (!Object.hasOwn(item, this.jsonKey)) {
          printError(
            `ERROR: object ${
              JSON.stringify(item)
            } doesn't have key '${this.jsonKey}'`,
          );
          Deno.exit(1);
        }
      }
    } else {
      source = lines.map((line) => ({ value: line }));
      this.jsonKey = "value";
    }
    return source;
  }
}

await Program.run(Deno.args);
