import { select } from "https://raw.githubusercontent.com/stsysd/dore/v0.4.7/mod.ts";

const selected = await select(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
