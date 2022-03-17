import { select } from "https://deno.land/x/dore/mod.ts";

const selected = await select(["foo", "bar", "baz"]);
console.log("SELECTED:", selected);
