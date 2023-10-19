# zod-class

This is a small utility library to accompany [Zod](https://github.com/colinhacks/zod) to enable for Types and Schemas to be defined in one line by creating a Class.

## Installation

```
npm install zod-class
```

## Usage

1. Define a new class

```ts
import z from "zod";
import { Z } from "zod-class";

// define a class using a zod schema
export class Hello extends Z.class({
  name: z.string(),
}) {
  get getMessage() {
    return `hello ${name}`
  }
}

const hello = new Hello({
  hello: "sam",
});
```

2. Parse a value to an instance of a ZodClass
```ts
const hello = Hello.parse(someVal)

// use method on the instance 
const message = hello.getMessage();
```

3. Extend a class

```ts
export class World extends Hello.extend({
  world: z.string()
}) {}

const world = new World({
  hello: "world",
  world: "hello"
});
```

## Why?

It can be annoying to always have redundant declarations for types and schemas:

1. the `z.object` declaration
2. the derived type using `z.infer`

```ts
interface HelloSchema extends z.infer<typeof HelloSchema> {}
const HelloSchema = z.object({
  key: z.string(),
});
```

`zod-class` enables this to be achieved in a single line.

It also provides a class that can be instantiated and methods added to.

```ts
export class Person extends Z.class({
  firstName: z.string(),
  lastName: z.string(),
}) {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

