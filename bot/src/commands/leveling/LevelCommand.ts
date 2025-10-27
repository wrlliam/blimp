import config from "@/config";
import { defaultEmbeds, Embed } from "@/core/Embed";
import { Command } from "@/core/typings";
import { db } from "@/db";
import { leveling } from "@/db/schema";
import { app } from "@/index";
import { findNextLevel, generateXPCard } from "@/modules/leveling";
import { createId, getGuildConfig } from "@/utils";
import { Permission, validatePermission } from "@/utils/permissions";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  Guild,
  resolveColor,
} from "discord.js";
import { and, eq } from "drizzle-orm";

export default {
  name: "level",
  description: "Leveling manipulation & information.",
  usage: [
    "/level current",
    "/level give (M)",
    "/level remove (M)",
    "/level set (A)",
    "/level reset (A)",
  ],
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "current",
      type: ApplicationCommandOptionType.Subcommand,
      description: "View your current level",
    },

    // {
    //   name: "xp",
    //   type: ApplicationCommandOptionType.Subcommand,
    //   description: "View the amount of required xp for the next/a level.",
    //   options: [
    //     {
    //       name: "level",
    //       type: ApplicationCommandOptionType.String,
    //       description: "The level",
    //       required: false,
    //     },
    //   ],
    // },
    {
      name: "give",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Add an additional amount of xp to a user. (M)",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp.",
          required: true,
        },
      ],
    },
    {
      name: "remove",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Remove an amount of xp from a user. (M)",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp.",
          required: true,
        },
      ],
    },
    {
      name: "set",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Set a users xp/level to a specific amount (A)",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        // {
        //   name: "type",
        //   type: ApplicationCommandOptionType.String,
        //   choices: [
        //     {
        //       name: "Level",
        //       value: "level",
        //     },
        //     {
        //       name: "Xp",
        //       value: "xp",
        //     },
        //   ],
        //   description: "The type to adjust.",
        //   required: true,
        // },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp/level to be set too.",
          required: true,
        },
      ],
    },
    {
      name: "reset",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Set a users xp to a specific amount (A)",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
      ],
    },
  ],
  run: async ({ ctx, client, args }) => {
    const subCommand = args.getSubcommand(true) as string;
    const guildConfig = await getGuildConfig(ctx.guild?.id as string);
    if (!guildConfig) return;

    if (!guildConfig.leveling)
      return ctx.reply({
        flags: ["Ephemeral"],
        content: `${
          config.emojis.cross
        } The leveling module is currently disabled. ${
          ctx.member.permissions.has("ManageGuild")
            ? "Turn it on to let members earn XP, level up, and unlock rewards through activity and engagement."
            : ""
        }`,
      });

    switch (subCommand.toLowerCase()) {
      case "current":
        const levelingData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.guildId, ctx.guild?.id as string),
              eq(leveling.userId, ctx.member.id)
            )
          );
        if (!levelingData || !levelingData[0])
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                color: resolveColor(config.colors.error),
                title: "An Error Occured",
                description:
                  "It appears we have no saved leveling data for you. Please start chatting and check again later.\n\n-# *If this issue persists please report it within my support server.*",
              }),
            ],
          });

        const nextLevel = await findNextLevel(
          levelingData[0].levelId as string,
          ctx.guild?.id as string
        );

        if (!nextLevel)
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                color: resolveColor(config.colors.error),
                title: "An Error Occured",
                description:
                  "It appears we were unable to find any future levels for you, please notify a staff member to ensure the leveling module is correctly configured..\n\n-# *If this issue persists please report it within my support server.*",
              }),
            ],
          });

        const cardBuffer = await generateXPCard({
          avatarUrl: ctx.user.avatarURL({
            extension: "png",
            size: 512,
          }) as string,
          username: ctx.user.username,
          currentXP: levelingData[0].xp,
          requiredXP: nextLevel[1]?.xpRequired as number,
          level: nextLevel[0]?.level as number,
        });

        const attachment = new AttachmentBuilder(cardBuffer, {
          name: `xp-card-${ctx.user.id}.png`,
        });
        return ctx.reply({
          flags: ["Ephemeral"],
          files: [attachment],
        });
        break;
      case "give":
        const validPermissons = validatePermission(
          ctx.member,
          ctx.guild as Guild,
          Permission.MOD
        );
        if (!validPermissons)
          return ctx.reply({
            embeds: [defaultEmbeds["missing-permissions"]()],
          });

        const user = args.getUser("user", true);
        const amount = args.getNumber("amount", true);

        if (user.bot)
          return ctx.reply({
            flags: ["Ephemeral"],
            content: `${config.emojis.cross} Please provide a valid member to give xp too.`,
          });

        let userData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.userId, user.id),
              eq(leveling.guildId, ctx.guild?.id as string)
            )
          );
        if (!userData) {
          return await db
            .insert(leveling)
            .values({
              guildId: ctx.guild?.id as string,
              userId: user.id,
              id: createId(),
              xp: amount,
            })
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Given",
                    },
                    description: `${config.emojis.tick} Successfully given <@${user.id}> an additonal **${amount}** XP.`,
                  }),
                ],
              });
            })
            .catch(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        } else {
          return await db
            .update(leveling)
            .set({
              xp: userData[0].xp + amount,
            })
            .where(
              and(
                eq(leveling.guildId, ctx.guild?.id as string),
                eq(leveling.userId, user.id)
              )
            )
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Given",
                    },
                    description: `${config.emojis.tick} Successfully given <@${
                      user.id
                    }> an additonal **${amount}** XP. Their XP total is now ${
                      userData[0].xp + amount
                    }.`,
                  }),
                ],
              });
            })
            .catch(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        }
        break;
      case "reset":
        const resetValidatePermissons = validatePermission(
          ctx.member,
          ctx.guild as Guild,
          Permission.ADMIN
        );
        if (!resetValidatePermissons)
          return ctx.reply({
            embeds: [defaultEmbeds["missing-permissions"]()],
          });

        const resetUser = args.getUser("user", true);

        if (resetUser.bot)
          return ctx.reply({
            flags: ["Ephemeral"],
            content: `${config.emojis.cross} Please provide a valid member to set their xp/level too.`,
          });

        let resetUserData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.userId, resetUser.id),
              eq(leveling.guildId, ctx.guild?.id as string)
            )
          );
        if (!resetUserData) {
          return await db
            .insert(leveling)
            .values({
              guildId: ctx.guild?.id as string,
              userId: resetUser.id,
              id: createId(),
              xp: 0,
            })
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Updated",
                    },
                    description: `${config.emojis.tick} Successfully reset <@${resetUser.id}> XP to **0**.`,
                  }),
                ],
              });
            })
            .catch(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        } else {
          return await db
            .update(leveling)
            .set({
              xp: 0,
            })
            .where(
              and(
                eq(leveling.guildId, ctx.guild?.id as string),
                eq(leveling.userId, resetUser.id)
              )
            )
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Updated",
                    },
                    description: `${config.emojis.tick} Successfully updated <@${resetUser.id}> xp to **0**.`,
                  }),
                ],
              });
            })
            .catch((e) => {
              console.log(e);
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        }
        break;
      case "set":
        const validatePermissons = validatePermission(
          ctx.member,
          ctx.guild as Guild,
          Permission.ADMIN
        );
        if (!validatePermissons)
          return ctx.reply({
            embeds: [defaultEmbeds["missing-permissions"]()],
          });

        const setUser = args.getUser("user", true);
        const setAmount = args.getNumber("amount", true);

        if (setUser.bot)
          return ctx.reply({
            flags: ["Ephemeral"],
            content: `${config.emojis.cross} Please provide a valid member to set their xp/level too.`,
          });

        let setUserData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.userId, setUser.id),
              eq(leveling.guildId, ctx.guild?.id as string)
            )
          );
        if (!setUserData) {
          return await db
            .insert(leveling)
            .values({
              guildId: ctx.guild?.id as string,
              userId: setUser.id,
              id: createId(),
              xp: setAmount,
            })
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Updated",
                    },
                    description: `${config.emojis.tick} Successfully set <@${setUser.id}> XP to **${setAmount}**.`,
                  }),
                ],
              });
            })
            .catch(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        } else {
          return await db
            .update(leveling)
            .set({
              xp: setAmount,
            })
            .where(
              and(
                eq(leveling.guildId, ctx.guild?.id as string),
                eq(leveling.userId, setUser.id)
              )
            )
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Updated",
                    },
                    description: `${config.emojis.tick} Successfully updated <@${setUser.id}> xp to **${setAmount}**.`,
                  }),
                ],
              });
            })
            .catch((e) => {
              console.log(e);
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        }
        break;
      case "remove":
        const removeValidatePermissons = validatePermission(
          ctx.member,
          ctx.guild as Guild,
          Permission.ADMIN
        );
        if (!removeValidatePermissons)
          return ctx.reply({
            embeds: [defaultEmbeds["missing-permissions"]()],
          });

        const removeUser = args.getUser("user", true);
        const removeAmount = args.getNumber("amount", true);

        if (removeUser.bot)
          return ctx.reply({
            flags: ["Ephemeral"],
            content: `${config.emojis.cross} Please provide a valid member to set their xp/level too.`,
          });

        let removeUserData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.userId, removeUser.id),
              eq(leveling.guildId, ctx.guild?.id as string)
            )
          );
        if (!removeUserData) {
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                author: {
                  iconURL: app.user?.avatarURL({
                    extension: "png",
                    size: 128,
                  }) as string,
                  name: "XP Updated",
                },
                description: `${config.emojis.cross} This user doesnt have any existing xp.`,
              }),
            ],
          });
        } else {
          const amount = removeUserData[0].xp < removeAmount ? 0 : removeUserData[0].xp - removeAmount
          return await db
            .update(leveling)
            .set({
              xp: amount < 0 ? 0 : amount,
            })
            .where(
              and(
                eq(leveling.guildId, ctx.guild?.id as string),
                eq(leveling.userId, removeUser.id)
              )
            )
            .execute()
            .then(() => {
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [
                  new Embed({
                    author: {
                      iconURL: app.user?.avatarURL({
                        extension: "png",
                        size: 128,
                      }) as string,
                      name: "XP Updated",
                    },
                    description: `${config.emojis.tick} Successfully removed **${removeAmount}** of XP from <@${removeUser.id}>.`,
                  }),
                ],
              });
            })
            .catch((e) => {
              console.log(e);
              return ctx.reply({
                flags: ["Ephemeral"],
                embeds: [defaultEmbeds["unexpected-error"]()],
              });
            });
        }
        break;
      default:
        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.error),
              description: `${config.emojis.cross} Unknown leveling subcommand.`,
            }),
          ],
        });
    }
  },
} as Command;
