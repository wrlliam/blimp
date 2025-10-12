import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Guild,
} from "discord.js";
import type { Command } from "@/core/typings";
import { getCommand } from "@/utils/misc";

export default {
  name: "warn",
  description: "Warn a member.",
  usage: ["/warn [user] [reason]"],
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: ["KickMembers"],
  options: [
    {
      name: "target",
      type: ApplicationCommandOptionType.User,
      description: "the user to warn",
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
      name: "permanant",
      type: ApplicationCommandOptionType.Boolean,
      description: "if true, then the warning will never expire.",
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
  run: async ({ ctx, client, args }) => {
    const user = args.getUser("target", true);
    const reason = args.getString("reason", true);
    const silent = args.getBoolean("silent");
    const permanant = args.getBoolean("permanant") || true;
    const proof = args.getAttachment("proof");
    const history = args.getNumber("history");
    const remove = args.getBoolean("remove");

    const sys = await client.moderation.warn(ctx.guild as Guild);
    const valid = sys.valid([
      () => user !== undefined,
      () => typeof reason === "string" && reason.length > 0 && reason !== "",
    ])(getCommand(ctx.commandName), client);

    if (!valid.value) return ctx.reply(valid.response);

    const msg = await ctx.reply(
      await sys.logic({
        user,
        reason,
        silent,
        permanant,
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
