import { ZodRawShape, z } from "zod";
import { Z } from "../src/index.js";

test("support extending classes", () => {
  class Foo extends Z.class({
    foo: z.string(),
    bar: z.number(),
    baz: z.enum(["Forty", "Two"]),
  }) {}

  const foo = new Foo({
    foo: "foo",
    bar: 1,
    baz: "Two",
  });

  const parsedFoo = Foo.parse({
    foo: "foo",
    bar: 1,
    baz: "Two",
  });
  expect(parsedFoo instanceof Foo).toBe(true);
  expect(foo).toMatchObject(parsedFoo);

  class Bar extends Foo.extend({
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
  const parsedBar = Bar.parse({
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
  class Foo extends Z.class({
    foo: z.string(),
  }) {
    getFoo() {
      return this.foo;
    }
  }

  class Bar extends Foo.extend({
    foo: z.literal("forty-two"),
    bar: z.number(),
  }) {
    getBar() {
      return this.bar;
    }
  }

  const B = Foo.extend({
    foo: z.literal("forty-two"),
    bar: z.number(),
  });

  const barSchema = {
    foo: "forty-two",
    bar: 42,
  };

  const bar = Bar.parse(barSchema);

  expect(bar.getFoo()).toEqual("forty-two");
  expect(bar.getBar()).toEqual(42);

  class Baz extends Bar.extend({
    baz: z.string(),
  }) {
    getFoo() {
      return `foo: Z{super.getFoo()}`;
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

test("should support classes as properties in an object", () => {
  class Foo extends Z.class({
    foo: z.string(),
  }) {}

  class Bar extends Z.class({
    Foo,
    list: z.array(Foo),
  }) {}

  const bar = new Bar({
    Foo: new Foo({ foo: "foo" }),
    list: [new Foo({ foo: "foo" })],
  });

  class Baz extends Z.class({
    foobar: z.tuple([Foo, Bar]),
  }) {}

  const baz = new Baz({
    foobar: [new Foo({ foo: "foo" }), bar],
  });

  const XYZ = z.object({
    Baz,
    Bar: Bar.optional(),
    bar: Bar.nullable(),
  });
  type XYZ = Z.infer<typeof XYZ>;
  const xyz: XYZ = {
    bar,
    Baz: baz,
  };
});
