import { z } from "zod";
import { ZodClass, $ } from "../src/index.js";

test("support extending classes", () => {
  class Foo extends ZodClass({
    foo: z.string(),
    bar: z.number(),
    baz: z.enum(["Forty", "Two"]),
  }) {}

  const foo = new Foo({
    foo: "foo",
    bar: 1,
    baz: "Two",
  });
  const parsedFoo = Foo.parse<Foo>({
    foo: "foo",
    bar: 1,
    baz: "Two",
  });
  expect(parsedFoo instanceof Foo).toBe(true);
  expect(foo).toMatchObject(parsedFoo);

  class Bar extends $(Foo).extend({
    baz: z.literal("Forty"),
  }) {
    getFoo() {
      return this.foo;
    }
    getBar() {
      return this.bar;
    }
    getBaz() {
      return this.baz;
    }
  }

  expect(() => {
    const bar = new Bar({
      bar: 1,
      foo: "foo",
      // @ts-expect-error - should be narrowed
      baz: "Two",
    });

    const forty: "Forty" = bar.getBaz();
    // @ts-expect-error - should be narrowed to "Forty"
    const two: "Two" = bar.getBaz();
  }).toThrow();

  const bar = new Bar({
    foo: "foo",
    bar: 1,
    baz: "Forty",
  });

  expect(bar instanceof Bar).toBe(true);
  const parsedBar = Bar.parse<Bar>({
    foo: "foo",
    bar: 1,
    baz: "Forty",
  });
  expect(bar).toMatchObject(parsedBar);
  expect(bar.getFoo()).toEqual("foo");
  expect(bar.getFoo()).toEqual(parsedBar.getFoo());
  expect(bar.getBar()).toEqual(1);
  expect(bar.getBar()).toEqual(parsedBar.getBar());
  expect(bar.getBaz()).toEqual("Forty");
  expect(bar.getBaz()).toEqual(parsedBar.getBaz());
});

test("should inherit class methods", () => {
  class Foo extends $({
    foo: z.string(),
  }) {
    getFoo() {
      return this.foo;
    }
  }

  class Bar extends $(Foo).extend({
    foo: z.literal("forty-two"),
    bar: z.number(),
  }) {
    getBar() {
      return this.bar;
    }
  }

  const barSchema = {
    foo: "forty-two",
    bar: 42,
  };

  const bar = $(Bar).parse(barSchema);

  expect(bar.getFoo()).toEqual("forty-two");
  expect(bar.getBar()).toEqual(42);

  class Baz extends $(Bar).extend({
    baz: z.string(),
  }) {
    getFoo() {
      return `foo: ${super.getFoo()}`;
    }
    getBaz() {
      return this.baz;
    }
  }

  const baz = new Baz({
    bar: 42,
    foo: "forty-two",
    baz: "baz",
  });

  expect(baz.getFoo()).toEqual("foo: forty-two");
  expect(baz.getBaz()).toEqual("baz");
});
