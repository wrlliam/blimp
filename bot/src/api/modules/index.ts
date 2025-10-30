import Elysia from "elysia";

import { reactionRolesModule } from "./reaction-roles";
import { analyticsModule } from "./analytics";
import { customCommandModule } from "./custom-command";
import { welcomeAndGoodbyeModule } from "./welcome-and-goodbye";
import { embedAndMessagesModule } from "./embed-and-messages";
import { levelingModule } from "./leveling";
import { settingsModule } from "./settings";
import { starboardModule } from "./starboards";

export const modules = new Elysia({
  prefix: "/modules",
})
  .use(reactionRolesModule)
  .use(analyticsModule)
  .use(customCommandModule)
  .use(welcomeAndGoodbyeModule)
  .use(embedAndMessagesModule)
  .use(levelingModule)
  .use(settingsModule)
  .use(starboardModule);
