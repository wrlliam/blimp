import { ApplicationCommandType, Guild } from "discord.js";
import type { Command } from "../../core/typings";
import config from "@/config";

export default {
  name: "emit",
  description: "Emit something...",
  usage: ["/emit"],
  devOnly: true,
  type: ApplicationCommandType.ChatInput,
  run: ({ ctx, client, args }) => {
    client.emit("guildCreate", ctx.guild as Guild);
    ctx.reply({
      content: `${config.emojis.tick} Emitted.`,
    });
  },
} as Command;
