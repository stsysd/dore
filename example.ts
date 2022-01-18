import { selectString } from "https://raw.githubusercontent.com/stsysd/dore/v0.2.0/mod.ts";

const selected = await selectString(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
