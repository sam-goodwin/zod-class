import { z } from "zod";
import { Z } from "zod-class";

class User extends Z.class({
  name: z.string(),
  age: z.number(),
}) {
  getName() {
    return this.name;
  }
}

const user = User.parse({ name: "John", age: 20 });

user.getName();
