import { readLines } from "https://deno.land/std/io/mod.ts";
import {
  Arg,
  Command,
  Flag,
  Help,
  Name,
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

  @Flag({ about: "select multiple item", short: "m" })
  multiselect = false;

  async execute(): Promise<void> {
    const source = await this.loadSource();
    if (source.length === 0) {
      printError("ERROR: no choice");
      Deno.exit(1);
    }
    if (this.multiselect) {
      const selected = await selectMany(source);
      if (selected.length === 0) {
        printError("ERROR: cancelled");
        Deno.exit(1);
      }
      for (const item of selected) {
        console.log(item);
      }
    } else {
      const selected = await select(source);
      if (selected === null) {
        printError("ERROR: cancelled");
        Deno.exit(1);
      }
      console.log(selected);
    }
  }

  async loadSource(): Promise<string[]> {
    const input = this.file ? await Deno.open(this.file) : Deno.stdin;
    if (Deno.isatty(input.rid)) {
      printError("ERROR: fail to setup source: input is tty");
      Deno.exit(1);
    }
    const source = [];
    for await (const line of readLines(input)) {
      source.push(line);
    }
    return source;
  }
}

await Program.run(Deno.args);
