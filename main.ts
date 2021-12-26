import { readLines } from "https://deno.land/std/io/mod.ts";
import {
  Arg,
  Command,
  Help,
  Name,
  Version,
} from "https://raw.githubusercontent.com/stsysd/classopt/v0.1.0/mod.ts";
import { interactiveSelection } from "./mod.ts";

@Name("isel")
@Version("0.0.0")
@Help("interactive selector")
class Program extends Command {
  @Arg({ name: "FILE", optional: true })
  file = "";

  async execute(): Promise<void> {
    const source = await this.loadSource();
    const selected = await interactiveSelection(source);
    if (selected != null) {
      console.log(selected);
    }
  }

  async loadSource(): Promise<string[]> {
    const input = this.file ? await Deno.open(this.file) : Deno.stdin;
    if (Deno.isatty(input.rid)) {
      console.error("ERROR: fail to setup source: input is tty");
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
