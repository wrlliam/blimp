import { ApplicationCommandType } from "discord.js";
import type { Command } from "../../core/typings";
import config from "@/config";

export default {
  name: "emit",
  description: "Emit something...",
  usage: ["/emit"],
  adminOnly: true,
  type: ApplicationCommandType.ChatInput,
  run: ({ ctx, client, args }) => {
    client.emit("guildMemberRemove", ctx.member);
    ctx.reply({
      content: `${config.emojis.tick} Emitted.`,
    });
  },
} as Command;
