import { keycode } from "../deps.ts";
import { IConsole, InteractiveSelector } from "../mod.ts";
import { assertEquals } from "https://deno.land/std@0.119.0/testing/asserts.ts";
const RETURN_KEY = {
  name: "return",
  sequence: "\r",
  code: undefined,
  ctrl: false,
  meta: false,
  shift: false,
};
const UP_KEY = {
  name: "up",
  sequence: "\x1b[A",
  code: "[A",
  ctrl: false,
  meta: false,
  shift: false,
};
const DOWN_KEY = {
  name: "down",
  sequence: "\x1b[B",
  code: "[B",
  ctrl: false,
  meta: false,
  shift: false,
};
// const RIGHT_KEY = {
//   name: "right",
//   sequence: "\x1b[C",
//   code: "[C",
//   ctrl: false,
//   meta: false,
//   shift: false,
// };
// const LEFT_KEY = {
//   name: "left",
//   sequence: "\x1b[D",
//   code: "[D",
//   ctrl: false,
//   meta: false,
//   shift: false,
// };
const BACKSPACE_KEY = {
  name: "backspace",
  sequence: "\x7f",
  code: undefined,
  ctrl: false,
  meta: false,
  shift: false,
};
// const TAB_KEY = {
//   name: "tab",
//   sequence: "\t",
//   code: undefined,
//   ctrl: false,
//   meta: false,
//   shift: false,
// };

const encoder = new TextEncoder();
function encode(str: string): Uint8Array {
  return encoder.encode(str);
}

async function* str2keys(s: string): AsyncGenerator<keycode.KeyCode> {
  for (const key of keycode.parse(encode(s))) {
    yield key;
  }
}

async function* appendAsyncGenerator<T>(
  ...gens: (T[] | Generator<T> | AsyncGenerator<T>)[]
): AsyncGenerator<T> {
  for (const gen of gens) {
    for await (const t of gen) {
      yield t;
    }
  }
}

function fakeConsole(keys: AsyncGenerator<keycode.KeyCode>): IConsole {
  return {
    write(_: Uint8Array) {
      // nothing
      return Promise.resolve();
    },
    size() {
      return { columns: 80, rows: 40 };
    },
    keypress() {
      return keys;
    },
  };
}

Deno.test("input nothing", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(source, fakeConsole(str2keys("\r")));
  const result = await dore.run();
  assertEquals(result, "foo");
});

Deno.test("select", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(source, fakeConsole(str2keys("q\r")));
  const result = await dore.run();
  assertEquals(result, "qux");
});

Deno.test("keep order", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(source, fakeConsole(str2keys("ba\r")));
  const result = await dore.run();
  assertEquals(result, "bar");
});

Deno.test("select with AND pattern", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(str2keys("foo bar\r")),
  );
  const result = await dore.run();
  assertEquals(result, "foobar");
});

Deno.test("return null", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(source, fakeConsole(str2keys("hoge\r")));
  const result = await dore.run();
  assertEquals(result, null);
});

Deno.test("backspace key", async () => {
  const source = ["foo", "bar", "baz", "qux", "foobar"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(
      appendAsyncGenerator(str2keys("bar"), [BACKSPACE_KEY], str2keys("z\n")),
    ),
  );
  const result = await dore.run();
  assertEquals(result, "baz");
});

Deno.test("down key", async () => {
  const source = ["foo", "bar 1", "bar 2", "bar 3", "bar 4", "bar 5", "baz"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(
      appendAsyncGenerator(str2keys("bar"), [DOWN_KEY, DOWN_KEY, RETURN_KEY]),
    ),
  );
  const result = await dore.run();
  assertEquals(result, "bar 3");
});

Deno.test("down key on bottom", async () => {
  const source = ["foo", "bar 1", "bar 2", "bar 3", "bar 4", "bar 5", "baz"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(appendAsyncGenerator(
      str2keys("bar"),
      [...Array(10)].map(() => DOWN_KEY),
      [RETURN_KEY],
    )),
  );
  const result = await dore.run();
  assertEquals(result, "bar 5");
});

Deno.test("up key", async () => {
  const source = ["foo", "bar 1", "bar 2", "bar 3", "bar 4", "bar 5", "baz"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(appendAsyncGenerator(str2keys("bar"), [
      DOWN_KEY,
      DOWN_KEY,
      UP_KEY,
      RETURN_KEY,
    ])),
  );
  const result = await dore.run();
  assertEquals(result, "bar 2");
});

Deno.test("up key on top", async () => {
  const source = ["foo", "bar 1", "bar 2", "bar 3", "bar 4", "bar 5", "baz"];
  const dore = new InteractiveSelector(
    source,
    fakeConsole(appendAsyncGenerator(
      str2keys("bar"),
      [...Array(10)].map(() => DOWN_KEY),
      [...Array(20)].map(() => UP_KEY),
      [RETURN_KEY],
    )),
  );
  const result = await dore.run();
  assertEquals(result, "bar 1");
});
