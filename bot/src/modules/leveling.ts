import config from "@/config";
import { db } from "@/db";
import {
  guildLevel,
  GuildLevelInsert,
  GuildLevelSelect,
  leveling,
} from "@/db/schema";
import { createId, err, info } from "@/utils";
import { Guild, GuildMember, Message } from "discord.js";
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
    return levels && levels.length > 0 ? levels : [];
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

  public getXpForLevel(level: GuildLevelSelect, userXp: number): number[] {
    return [level.xpRequired as number, (level.xpRequired as number) - userXp];
  }

  public getProgress(xp: number, level: GuildLevelSelect): number {
    return Math.round((xp / this.getXpForLevel(level, xp)[0]) * 100);
  }

  public progressToBar(progress: number): string {
    const stages = 10;
    const perStage = 100 / stages; // 20% per stage
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

  public async messageLogic(member: GuildMember, message: Message) {
    const data = await this.getLevelingData(member);
    if (!data) return;

    const additionalExp = this.generateBaseXp();

    const levels = await this.getLevels(member.guild);
    let nextLevel =
      levels[
        levels.indexOf(
          (levels.find((f) => f.id === data.levelId) as GuildLevelSelect) ||
            levels[0]
        ) + 1
      ];

    const updatedXp = data.xp + additionalExp;

    const nextBaseline = this.getXpForLevel(nextLevel, updatedXp);

    if (nextBaseline[1] <= 0) {
      const newCurrentLevel = nextLevel;

      nextLevel =
        levels[
          levels.indexOf(
            (levels.find((f) => f.id === data.levelId) as GuildLevelSelect) ||
              levels[0]
          ) + 2
        ];

      const progress = this.getProgress(updatedXp as number, nextLevel);

      await db
        .update(leveling)
        .set({
          xp: updatedXp,
          levelId: nextLevel.id,
        })
        .where(
          and(
            eq(leveling.guildId, member.guild.id),
            eq(leveling.userId, member.id)
          )
        )
        .execute();

      return message.reply({
        content: `${config.emojis.levels.lvl_one} Congrats on leveling up <@${member.id}>! You are now **level ${newCurrentLevel.level}** \n\n-# You are now ${progress}% to level ${nextLevel.level} (${additionalExp}xp/${nextLevel.xpRequired}xp).`,
      });
      
    } else {
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
    { guildId: guild.id, id: createId(), level: 0, xpRequired: 0 },
    { guildId: guild.id, id: createId(), level: 1, xpRequired: 500 },
    { guildId: guild.id, id: createId(), level: 5, xpRequired: 1724 },
    { guildId: guild.id, id: createId(), level: 10, xpRequired: 3120 },
    { guildId: guild.id, id: createId(), level: 15, xpRequired: 4812 },
    { guildId: guild.id, id: createId(), level: 20, xpRequired: 6120 },
    { guildId: guild.id, id: createId(), level: 25, xpRequired: 7500 },
  ] as GuildLevelInsert[];

  await db
    .insert(guildLevel)
    .values(data)
    .execute()
    .catch(() => err(`Failed to boiler plate guilds levels ${guild.id}`))
    .then(() => info(`Boilerplated ${guild.id}'s levels`));
};
