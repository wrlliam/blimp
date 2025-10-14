import Elysia from "elysia";

import { reactionRolesModule } from "./reaction-roles";
import { analyticsModule } from "./analytics";
import { customCommandModule } from "./custom-command";

export const modules = new Elysia({
  prefix: "/modules",
})
  .use(reactionRolesModule)
  .use(analyticsModule)
  .use(customCommandModule);
