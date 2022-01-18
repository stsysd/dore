import { interactiveSelection } from "https://raw.githubusercontent.com/stsysd/dore/v0.1.1/mod.ts";

const selected = await interactiveSelection(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
