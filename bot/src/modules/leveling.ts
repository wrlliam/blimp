import config from "@/config";
import { db } from "@/db";
import { redis } from "@/db/redis";
import {
  guildConfig,
  guildLevel,
  GuildLevelInsert,
  GuildLevelSelect,
  leveling,
} from "@/db/schema";
import {
  createId,
  err,
  formatVariableBody,
  formMessagePayload,
  getGuildConfig,
  info,
  variableFormat,
} from "@/utils";
import { time } from "console";
import { Guild, GuildMember, Message, MessagePayload } from "discord.js";
import { and, eq } from "drizzle-orm";

export type Multiplier = {
  id: number;
  name: string;
  factor: number; // e.g 2 for x2
};

export default class Leveling {
  public mulipliters: Multiplier[] = [];

  constructor() {}

  private generateBaseXp(): number {
    const random = Math.random();
    const skewed = Math.pow(random, 2); // Square to favor lower end
    return Math.floor(skewed * 11) + 4; // 4-14 XP, heavily favoring 4-8
  }

  public async getLevels(guild: Guild): Promise<GuildLevelSelect[]> {
    const levels = await db
      .select()
      .from(guildLevel)
      .where(eq(guildLevel.guildId, guild.id));

    // Always return sorted by xpRequired ascending
    return levels && levels.length > 0
      ? levels.sort(
          (a, b) => (a.xpRequired as number) - (b.xpRequired as number)
        )
      : [];
  }

  private async getLevelingData(member: GuildMember) {
    let levelingData = await db
      .select()
      .from(leveling)
      .where(
        and(
          eq(leveling.userId, member.id),
          eq(leveling.guildId, member.guild.id)
        )
      );

    const levels = await this.getLevels(member.guild);
    if (!levelingData || levelingData.length <= 0) {
      await db
        .insert(leveling)
        .values({
          guildId: member.guild.id,
          userId: member.id,
          xp: 0,
          levelId: levels && levels[0] ? levels[0].id : null,
          id: createId(),
        })
        .execute();
    }

    const updatedLevelingData = await db
      .select()
      .from(leveling)
      .where(
        and(
          eq(leveling.userId, member.id),
          eq(leveling.guildId, member.guild.id)
        )
      )
      .execute();

    return updatedLevelingData && updatedLevelingData.length > 0
      ? updatedLevelingData[0]
      : null;
  }

  public getTotalMultiplier() {
    if (this.mulipliters.length === 0) return 1;
    return this.mulipliters.reduce((acc, mult) => acc * mult.factor, 1);
  }

  /**
   * Calculate XP progress between current level and next level
   * @param currentLevel - The current level object
   * @param nextLevel - The next level object
   * @param userXp - User's current XP
   * @returns [xpNeeded, xpRemaining, xpProgress]
   */
  public getXpProgress(
    currentLevel: GuildLevelSelect,
    nextLevel: GuildLevelSelect,
    userXp: number
  ): [number, number, number] {
    const currentRequired = currentLevel.xpRequired as number;
    const nextRequired = nextLevel.xpRequired as number;
    const xpNeeded = nextRequired - currentRequired;
    const xpProgress = userXp - currentRequired;
    const xpRemaining = nextRequired - userXp;

    return [xpNeeded, xpRemaining, xpProgress];
  }

  /**
   * Calculate progress percentage between two levels
   * @param currentLevel - The current level object
   * @param nextLevel - The next level object
   * @param userXp - User's current XP
   * @returns Progress percentage (0-100)
   */
  public getProgress(
    currentLevel: GuildLevelSelect,
    nextLevel: GuildLevelSelect,
    userXp: number
  ): number {
    const [xpNeeded, _, xpProgress] = this.getXpProgress(
      currentLevel,
      nextLevel,
      userXp
    );

    if (xpNeeded === 0) return 100;

    const progress = (xpProgress / xpNeeded) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  public progressToBar(progress: number): string {
    const stages = 10;
    const perStage = 100 / stages;
    let str = "";

    for (let i = 0; i < stages; i++) {
      const stageStart = i * perStage;
      const stageEnd = (i + 1) * perStage;

      if (progress >= stageEnd) {
        str += "█";
      } else if (progress > stageStart) {
        str += "▓";
      } else {
        str += "░";
      }
    }

    return str;
  }

  /**
   * Find the appropriate level based on XP amount
   */
  public getClosestLevel(
    xp: number,
    levels: GuildLevelSelect[]
  ): GuildLevelSelect | null {
    if (!levels || levels.length === 0) return null;

    // Levels are already sorted from getLevels()
    let closestLevel: null | GuildLevelSelect = null;

    for (const level of levels) {
      if ((level.xpRequired as number) <= xp) {
        closestLevel = level;
      } else {
        break;
      }
    }

    return closestLevel;
  }

  /**
   * Get current and next level based on XP
   */
  private getCurrentAndNextLevel(
    xp: number,
    levels: GuildLevelSelect[]
  ): { current: GuildLevelSelect; next: GuildLevelSelect } {
    const currentLevel = this.getClosestLevel(xp, levels) || levels[0];
    const currentIndex = levels.findIndex((l) => l.id === currentLevel.id);
    const nextLevel =
      currentIndex < levels.length - 1
        ? levels[currentIndex + 1]
        : levels[levels.length - 1];

    return { current: currentLevel, next: nextLevel };
  }

  public async updateMemberRole(
    member: GuildMember,
    newLevel: GuildLevelSelect,
    levels: GuildLevelSelect[]
  ) {
    for (const level of levels) {
      if (level.roleId && level.id !== newLevel.id) {
        const role = member.guild.roles.cache.get(level.roleId);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role).catch(() => null);
        }
      }
    }

    if (newLevel.roleId) {
      const newRole = member.guild.roles.cache.get(newLevel.roleId);
      if (newRole) {
        await member.roles.add(newRole).catch(() => null);
      }
    }
  }

  public async sendMessage(body: MessagePayload, message: Message) {
    const msg = await message.reply(body);
    setTimeout(() => {
      msg.delete().catch(() => null);
    }, 2500);
  }

  public async messageLogic(member: GuildMember, message: Message) {
    const data = await this.getLevelingData(member);
    if (!data) return;
    const guildConfig = await getGuildConfig(member.guild.id);
    if (!guildConfig) return;

    const additionalExp = this.generateBaseXp();
    const levels = await this.getLevels(member.guild);

    for (let i = 0; i <= levels.length; i++) {
      const level = levels[i];
      if (
        level &&
        data.xp < (level.xpRequired as number) &&
        member.roles.cache.has(level.roleId as string)
      ) {
        const role = member.guild.roles.cache.find(
          (f) => f.id === level.roleId
        );
        if (role) {
          member.roles.remove(role);
        }
      }
    }

    const closestLevel = this.getClosestLevel(data.xp, levels);
    if (closestLevel) {
      const convertedLevel = await db
        .select()
        .from(guildLevel)
        .where(
          and(
            eq(guildLevel.id, data.levelId as string),
            eq(guildLevel.guildId, member.guild.id)
          )
        );

      const hasNoLevel = !convertedLevel || !convertedLevel[0];
      const hasIncorrectLevel =
        !hasNoLevel &&
        closestLevel.id !== data.levelId &&
        levels.indexOf(closestLevel) !==
          levels.indexOf(
            levels.find(
              (f) => f.id === convertedLevel[0].id
            ) as GuildLevelSelect
          );

      const condition = hasNoLevel || hasIncorrectLevel;

      if (condition) {
        await db
          .update(leveling)
          .set({
            levelId: closestLevel.id,
          })
          .where(
            and(
              eq(leveling.guildId, member.guild.id),
              eq(leveling.userId, member.id)
            )
          )
          .catch(() =>
            err(
              `Failed to update to closest role. ${member.guild.name} (${member.guild.id}) - @${member.id}`
            )
          )
          .then(async () => {
            this.updateMemberRole(member, closestLevel, levels);
            const body = formMessagePayload(
              await formatVariableBody(
                guildConfig.levelingMessage as string,
                member,
                member.guild
              )
            );
            return this.sendMessage(body as MessagePayload, message);
          });
      }
    }

    if (!levels || levels.length === 0) return;

    let lastestCacheStore = await redis.get(
      `${member.guild.id}-${member.user.id}-leveling`
    );
    if (!lastestCacheStore || isNaN(parseInt(lastestCacheStore))) {
      await redis
        .set(
          `${member.guild.id}-${member.user.id}-leveling`,
          new Date().getTime().toString()
        )
        .catch(() =>
          err(
            `Failed to store leveling cache ${member.guild.name} (${member.guild.id}) - ${member.user.username} (${member.id})`
          )
        );
    }

    // refresh
    lastestCacheStore = await redis.get(
      `${member.guild.id}-${member.user.id}-leveling`
    );

    const timeDiff =
      new Date().getTime() - parseInt(lastestCacheStore as string);

    if (timeDiff < config.timeout.leveling) return;

    await redis
      .set(
        `${member.guild.id}-${member.user.id}-leveling`,
        new Date().getTime().toString()
      )
      .catch(() =>
        err(
          `Failed to store leveling cache ${member.guild.name} (${member.guild.id}) - ${member.user.username} (${member.id}) [POST TIMEOUT]`
        )
      );

    const updatedXp = data.xp + additionalExp;

    // Get what level they SHOULD be at based on their current XP
    const actualCurrentLevel =
      this.getClosestLevel(data.xp, levels) || levels[0];

    // Get stored level from database
    const storedLevel = levels.find((l) => l.id === data.levelId) || levels[0];

    // Get what level they should be at with NEW xp
    const afterLevel = this.getClosestLevel(updatedXp, levels) || levels[0];

    // If their stored level doesn't match their actual level, fix it first
    const needsLevelSync = storedLevel.id !== actualCurrentLevel.id;

    // Check if they leveled up (or need to sync to correct level)
    const didLevelUp =
      actualCurrentLevel.id !== afterLevel.id || needsLevelSync;

    if (didLevelUp) {
      // They leveled up! Update to new level
      const afterIndex = levels.findIndex((l) => l.id === afterLevel.id);
      const nextLevel =
        afterIndex < levels.length - 1
          ? levels[afterIndex + 1]
          : levels[levels.length - 1];

      await db
        .update(leveling)
        .set({
          xp: updatedXp,
          levelId: afterLevel.id,
        })
        .where(
          and(
            eq(leveling.guildId, member.guild.id),
            eq(leveling.userId, member.id)
          )
        )
        .execute();

      // Remove old level roles, add new level role
      // for (const level of levels) {
      //   if (level.roleId && level.id !== afterLevel.id) {
      //     const role = member.guild.roles.cache.get(level.roleId);
      //     if (role && member.roles.cache.has(role.id)) {
      //       await member.roles.remove(role).catch(() => null);
      //     }
      //   }
      // }

      // if (afterLevel.roleId) {
      //   const newRole = member.guild.roles.cache.get(afterLevel.roleId);
      //   if (newRole) {
      //     await member.roles.add(newRole).catch(() => null);
      //   }
      // }

      this.updateMemberRole(member, afterLevel, levels);
      // Calculate progress to NEXT level
      const progress = this.getProgress(afterLevel, nextLevel, updatedXp);
      const [xpNeeded, xpRemaining, xpProgress] = this.getXpProgress(
        afterLevel,
        nextLevel,
        updatedXp
      );

      // Don't show progress if they're at max level
      // const isMaxLevel = afterLevel.id === nextLevel.id;

      // If this was a sync (not a real level up from new XP), don't show the message
      const wasJustSync =
        needsLevelSync && actualCurrentLevel.id === afterLevel.id;

      if (wasJustSync) {
        // Silently sync the level without notification
        return;
      }

      // const progressText = isMaxLevel
      //   ? ""
      //   : `\n\n-# You are now ${progress}% to level ${nextLevel.level} (${xpProgress}xp/${xpNeeded}xp).`;

      const body = formMessagePayload(
        await formatVariableBody(
          guildConfig.levelingMessage as string,
          member,
          member.guild
        )
      );

      return message.reply(body as MessagePayload);
    } else {
      // No level up, just add XP
      await db
        .update(leveling)
        .set({
          xp: updatedXp,
        })
        .where(
          and(
            eq(leveling.guildId, member.guild.id),
            eq(leveling.userId, member.id)
          )
        )
        .execute();
    }
  }
}

export const generateBoilerPlateLevels = async (guild: Guild) => {
  const levels = await db
    .select()
    .from(guildLevel)
    .where(eq(guildLevel.guildId, guild.id));
  if (levels && levels.length > 0) return;

  const data = [
    {
      guildId: guild.id,
      id: createId(),
      level: 0,
      xpRequired: 0,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 1,
      xpRequired: 500,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 5,
      xpRequired: 1724,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 10,
      xpRequired: 3120,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 15,
      xpRequired: 4812,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 20,
      xpRequired: 6120,
      roleId: null,
    },
    {
      guildId: guild.id,
      id: createId(),
      level: 25,
      xpRequired: 7500,
      roleId: null,
    },
  ] as GuildLevelInsert[];

  // Create roles in order (not reversed)
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const role = await guild.roles.create({
      name: `Level ${d.level}`,
      color: "Random",
      reason: "Boilerplate for leveling.",
      hoist: true,
    });

    data[i].roleId = role.id;
  }

  await db
    .insert(guildLevel)
    .values(data)
    .execute()
    .catch(() => err(`Failed to boiler plate guilds levels ${guild.id}`))
    .then(() => info(`Boilerplated ${guild.id}'s levels `));
};
