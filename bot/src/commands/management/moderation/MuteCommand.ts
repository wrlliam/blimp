import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Guild,
} from "discord.js";
import type { Command } from "../../../core/typings";
import { getCommand } from "@/utils";

export default {
  name: "mute",
  description: "Mute a member [for a specific amount of time.]",
  usage: ["/mute {user} {time}"],
  options: [
    {
      name: "target",
      type: ApplicationCommandOptionType.User,
      description: "the user to warn",
      required: true,
    },
    {
      name: "time",
      type: ApplicationCommandOptionType.String,
      description: "The amount of time for a mute, maximum 14 days. (E.G 14d, 3m, 10 seconds)",
      required: true,
    },
    {
      name: "reason",
      type: ApplicationCommandOptionType.String,
      description: "the reason behind the warning",
      required: true,
    },
    {
      name: "silent",
      type: ApplicationCommandOptionType.Boolean,
      description: "if true, then no DM will be sent.",
      required: false,
    },
    {
      name: "proof",
      type: ApplicationCommandOptionType.Attachment,
      description: 'An image, considered as "proof"',
      required: false,
    },
    {
      name: "history",
      type: ApplicationCommandOptionType.Number,
      description: "If set, the users messages will be saved. (<= 24)",
      required: false,
    },
    {
      name: "remove",
      type: ApplicationCommandOptionType.Boolean,
      description: "If true, the message will be removed.",
      required: false,
    },
  ],
  type: ApplicationCommandType.ChatInput,
  run: async ({ ctx, client, args }) => {
    const user = args.getUser("target", true);
    const reason = args.getString("reason", true);
    const silent = args.getBoolean("silent");
    const proof = args.getAttachment("proof");
    const time = args.getString("time", true);
    const history = args.getNumber("history");
    const remove = args.getBoolean("remove");

    const sys = await client.moderation.mute(ctx.guild as Guild);
    const valid = sys.valid([
      () => user !== undefined,
      () => typeof reason === "string" && reason.length > 0 && reason !== "",
      () =>
        !ctx.guild?.members.cache
          .find((f) => f.id === user.id)
          ?.permissions.has("ManageGuild") || true,
    ])(getCommand(ctx.commandName), client);

    if (!valid.value) return ctx.reply(valid.response);

    const msg = await ctx.reply(
      await sys.logic({
        user,
        reason,
        silent,
        time,
        proof,
        history,
        client,
        ctx,
      })
    );

    if (remove) sys.cleanUp(msg);

    return;
  },
} as Command;
