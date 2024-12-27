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
    getBaz(): this["baz"] {
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

test("should support classes as properties in an object", () => {
  class Foo extends Z.class({
    foo: z.string(),
  }) {}

  class Bar extends Z.class({
    Foo,
    list: z.array(Foo),
  }) {}
  Bar.shape.list;

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
    barNullableOptional: Bar.nullable().optional(),
    barOptionalNullable: Bar.optional().nullable(),
  });

  type XYZ = Z.output<typeof XYZ>;
  const xyz: XYZ = {
    bar,
    Baz: baz,
  };
  const parsedXYZ = XYZ.parse(xyz);
  expect(parsedXYZ).toEqual(xyz);
  expect(parsedXYZ.Baz).toBeInstanceOf(Baz);
});

test("static methods should be inherited", () => {
  class Foo extends Z.class({
    foo: z.string(),
  }) {
    static GetFoo() {
      return "foo";
    }
  }

  class Bar extends Foo.extend({
    bar: z.number(),
  }) {
    static GetBar() {
      return 42;
    }
  }

  expect(Bar.GetFoo()).toEqual("foo");
  expect(Bar.GetBar()).toEqual(42);
});

// see: https://github.com/sam-goodwin/zod-class/issues/14
test("should be able to reference a ZodClass's property schemas", () => {
  class Product extends Z.class({
    id: z.string().brand("ProductId"),
    price: z.number().min(1),
  }) {}

  class Order extends Z.class({
    id: z.string().brand("OrderId"),
    productId: Product.shape.id, // 👈 Re-using the branded type `id` from `Product` class
  }) {
    public getMessage() {
      return [this.id, this.productId];
    }
  }

  const o1 = new Order({
    id: "1",
    productId: "2",
  });
  expect(o1.getMessage()).toEqual(["1", "2"]);

  const o2 = new Order({
    id: Order.shape.id.parse("3"),
    productId: Order.shape.productId.parse("4"),
  });

  expect(o2.getMessage()).toEqual(["3", "4"]);

  // nice auto-type alias for the typeof Order.Id
  type OrderID = typeof Order.Id;

  const o3 = new Order({
    id: Order.Id.parse("5"),
    productId: Order.ProductId.parse("6"),
  });

  expect(o3.getMessage()).toEqual(["5", "6"]);
});

test("static properties should plumb through", () => {
  class Foo extends Z.class({
    id: z.string(),
  }) {}
  class Bar extends Foo.extend({
    bar: z.number(),
  }) {}
  Foo.staticProps;

  // type Keys = A extends (new (...args: any[]) => any) & infer Rest ? keyof Rest : never;

  Foo.Id;
  Bar.Id;
  expect(Foo.Id.parse("a")).toEqual("a");
  expect(Bar.Id.parse("b")).toEqual("b");
  expect(Bar.Bar.parse(42)).toEqual(42);
});

test("map type", () => {
  class Foo extends Z.class({
    map: z.map(z.string(), z.number()),
  }) {}

  new Foo({
    map: new Map<string, number>(),
  });
  new Foo({
    // @ts-expect-error
    map: new Map<number, number>(),
  });
  new Foo({
    // @ts-expect-error
    map: new Map<string, string>(),
  });

  const foo = new Foo({
    map: new Map([["", 2]]),
  });

  expect(foo.map.get("")).toEqual(2);

  const map: Map<string, number> = foo.map;
  // @ts-expect-error
  const map2: Map<number, number> = foo.map;
  // @ts-expect-error
  const map3: Map<string, string> = foo.map;
});

type DTO<T> = {
  save(item: T): Promise<void>;
};

test("ZodClass.schema() is a valid ZodSchema", async () => {
  function createZodDto<T>(schema: z.ZodType<T>): DTO<T> {
    return {
      async save(item: T) {},
    };
  }

  class User extends Z.class({
    username: z.string(),
  }) {
    getUsername() {
      return this.username;
    }
  }

  const userDTO = createZodDto(User.schema());

  await userDTO.save(
    new User({
      username: "sam",
    })
  );

  const user = User.schema().parse({
    username: "user",
  });

  expect(user.getUsername()).toEqual("user");
});

test("ZodClass.pick returns a new Class hierarchy", () => {
  class User extends Z.class({
    username: z.string(),
    password: z.string(),
    age: z.number(),
  }) {}

  class Age extends User.pick({
    age: true,
  }) {
    getAge() {
      return this.age;
    }
  }

  const age = new Age({
    age: 1,
  });
  expect(age.getAge()).toEqual(1);

  expect(age instanceof User).toBe(false);

  () => {
    // @ts-expect-error - Age is not an instance of User
    age.getUsername();
  };
});

test("ZodClass.pick supports string literals", () => {
  class User extends Z.class({
    username: z.string(),
    password: z.string(),
    age: z.number(),
  }) {}

  class Age extends User.pick("age") {
    getAge() {
      return this.age;
    }
  }

  const age = new Age({
    age: 1,
  });
  expect(age.getAge()).toEqual(1);

  expect(age instanceof User).toBe(false);

  () => {
    // @ts-expect-error - Age is not an instance of User
    age.getUsername();
  };
});

test("ZodClass.omit returns a new Class hierarchy", () => {
  class User extends Z.class({
    username: z.string(),
    password: z.string(),
    age: z.number(),
  }) {}

  class EternalUser extends User.omit({
    age: true,
  }) {
    getCredentials() {
      return `${this.username}:${this.password}`;
    }
  }

  const eternalUser = new EternalUser({
    username: "fully grown adult",
    password: "my little pony",
  });
  expect(eternalUser.getCredentials()).toEqual(
    `fully grown adult:my little pony`
  );

  expect(eternalUser instanceof User).toBe(false);

  () => {
    // @ts-expect-error - Age is not an instance of User
    eternalUser.getUsername();
  };
});

test("ZodClass.omit supports string literals", () => {
  class User extends Z.class({
    username: z.string(),
    password: z.string(),
    age: z.number(),
  }) {}

  class EternalUser extends User.omit("age") {
    getCredentials() {
      return `${this.username}:${this.password}`;
    }
  }

  const eternalUser = new EternalUser({
    username: "fully grown adult",
    password: "my little pony",
  });
  expect(eternalUser.getCredentials()).toEqual(
    `fully grown adult:my little pony`
  );

  expect(eternalUser instanceof User).toBe(false);

  () => {
    // @ts-expect-error - Age is not an instance of User
    eternalUser.getUsername();
  };
});

test("User.or(Person)", () => {
  class User extends Z.class({
    username: z.string(),
  }) {}
  class Person extends Z.class({
    name: z.string(),
  }) {}

  const UserOrPerson = User.or(Person);

  const user = UserOrPerson.parse({
    username: "user",
  });

  const person = UserOrPerson.parse({
    name: "sam",
  });

  expect(user).toBeInstanceOf(User);
  expect(person).toBeInstanceOf(Person);
});

test("z.union([User, Person])", () => {
  class User extends Z.class({
    username: z.string(),
  }) {}
  class Person extends Z.class({
    name: z.string(),
  }) {}

  const UserOrPerson = z.union([User, Person]);

  const user = UserOrPerson.parse({
    username: "user",
  });

  const person = UserOrPerson.parse({
    name: "sam",
  });

  expect(user).toBeInstanceOf(User);
  expect(person).toBeInstanceOf(Person);
});

test("optional object fields are optional", () => {
  // see: https://github.com/sam-goodwin/zod-class/issues/22
  class drat extends Z.class({
    foo: z.string().optional(),
  }) {}

  const ab = {};
  new drat(ab);
});

// see: https://github.com/sam-goodwin/zod-class/issues/31
describe("transforms", () => {
  test("should support transform in schema", async () => {
    class Test extends Z.class({
      prop: z.enum(["true", "false"]).transform((value) => value === "true"),
    }) {}

    const input = { prop: "true" } as const;

    // This should work and not have any type errors
    {
      const instance = new Test(input);
      expect(instance.prop).toBe(true);
      expect(instance).toBeInstanceOf(Test);
    }

    // This should also work and not throw
    {
      const instance = Test.parse(input);
      expect(instance.prop).toBe(true);
      expect(instance).toBeInstanceOf(Test);
    }

    {
      const instance = await Test.parseAsync(input);
      expect(instance.prop).toBe(true);
      expect(instance).toBeInstanceOf(Test);
    }

    {
      const instance = Test.safeParse(input);
      if (instance.success === false) {
        expect(instance).not.toHaveProperty("error");
        expect(instance.success).toBe(true);
        return;
      }
      expect(instance.data.prop).toBe(true);
    }

    {
      const instance = await Test.safeParseAsync(input);
      if (instance.success === false) {
        expect(instance).not.toHaveProperty("error");
        expect(instance.success).toBe(true);
        return;
      }
      expect(instance.data.prop).toBe(true);
    }
  });

  test("constructor should expect the schemas input,not output", () => {
    try {
      // @ts-expect-error should be a type error
      new Test({ prop: true });
    } catch {}
  });
});
