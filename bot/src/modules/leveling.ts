import config from "@/config";
import { db } from "@/db";
import { redis } from "@/db/redis";
import {
  CanvasGradient,
  createCanvas,
  loadImage,
  SKRSContext2D,
} from "@napi-rs/canvas";

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

interface XPCardOptions {
  avatarUrl: string;
  username: string;
  currentXP: number;
  requiredXP: number;
  level: number;
  rank?: number; // Optional: user's rank/position
  totalUsers?: number; // Optional: total users for context
}

// Theme colors
const colors = {
  accent: "#fba000",
  accentGlow: "#ff8800",
  background: "#1a1a1f",
  active: "#151518",
  border: "#2a2a30",
  subtle: "#121215",
  foreground: "#f5f5f5",
  abstractText: "#9b9ba8",
  dimText: "#6b6b78",
};

export async function generateXPCard(options: XPCardOptions): Promise<Buffer> {
  const {
    avatarUrl,
    username,
    currentXP,
    requiredXP,
    level,
    rank,
    totalUsers,
  } = options;

  // Canvas dimensions
  const width = 934;
  const height = 280;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw background with rounded corners and subtle gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, colors.active);
  bgGradient.addColorStop(1, colors.subtle);
  drawRoundedRect(ctx, 0, 0, width, height, 20, bgGradient);

  // Load and draw avatar
  try {
    const avatar = await loadImage(avatarUrl);
    const avatarSize = 160;
    const avatarX = 50;
    const avatarY = (height - avatarSize) / 2;

    // Draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Draw accent border around avatar
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  } catch (error) {
    console.error("Failed to load avatar:", error);
  }

  // Info section starts after avatar (centered vertically)
  const infoX = 250;
  const topY = 85;

  // Draw username (smaller, cleaner)
  ctx.fillStyle = colors.foreground;
  ctx.font = 'bold 38px "Segoe UI", sans-serif';
  ctx.fillText(username, infoX, topY);

  // Get username width for positioning
  const usernameWidth = ctx.measureText(username).width;

  // Draw rank badge next to username (if provided)
  if (rank && totalUsers) {
    const rankX = infoX + usernameWidth + 20;
    const rankY = topY - 28;
    const rankBadgeWidth = 90;
    const rankBadgeHeight = 32;

    drawRoundedRect(
      ctx,
      rankX,
      rankY,
      rankBadgeWidth,
      rankBadgeHeight,
      8,
      colors.subtle
    );

    ctx.fillStyle = colors.abstractText;
    ctx.font = "600 15px sans-serif";
    const rankText = `#${rank}`;
    const rankTextWidth = ctx.measureText(rankText).width;
    ctx.fillText(
      rankText,
      rankX + (rankBadgeWidth - rankTextWidth) / 2,
      rankY + 21
    );
  }

  // Draw level and XP info on same line
  const statsY = topY + 35;

  // Level badge (smaller, more refined)
  const levelBadgeX = infoX;
  const levelBadgeY = statsY;

  ctx.fillStyle = colors.accent;
  ctx.font = "600 20px sans-serif";
  const levelText = `Level ${level}`;
  ctx.fillText(levelText, levelBadgeX, levelBadgeY);

  const levelWidth = ctx.measureText(levelText).width;

  // XP text with subtle separator
  ctx.fillStyle = colors.dimText;
  ctx.font = "400 18px sans-serif";
  const separator = "  •  ";
  ctx.fillText(separator, levelBadgeX + levelWidth, levelBadgeY);

  const sepWidth = ctx.measureText(separator).width;

  ctx.fillStyle = colors.abstractText;
  const xpText = `${currentXP.toLocaleString()} / ${requiredXP.toLocaleString()} XP`;
  ctx.fillText(xpText, levelBadgeX + levelWidth + sepWidth, levelBadgeY);

  // Progress bar (more refined design)
  const progressX = infoX;
  const progressY = statsY + 40;
  const progressWidth = width - infoX - 50;
  const progressHeight = 28;
  const progress = Math.min(currentXP / requiredXP, 1);

  // Background bar with inner shadow effect
  drawRoundedRect(
    ctx,
    progressX,
    progressY,
    progressWidth,
    progressHeight,
    14,
    colors.subtle
  );

  // Add inner border for depth
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  drawRoundedRectStroke(
    ctx,
    progressX + 1,
    progressY + 1,
    progressWidth - 2,
    progressHeight - 2,
    13
  );

  // Progress fill with enhanced gradient
  if (progress > 0) {
    const fillWidth = Math.max(progressWidth * progress, 28); // Minimum width for rounded corners

    const gradient = ctx.createLinearGradient(
      progressX,
      0,
      progressX + fillWidth,
      0
    );
    gradient.addColorStop(0, colors.accent);
    gradient.addColorStop(0.5, colors.accentGlow);
    gradient.addColorStop(1, colors.accent);

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, progressX, progressY, fillWidth, progressHeight, 14);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(progressX, progressY, fillWidth, progressHeight);

    // Add subtle shine effect
    const shineGradient = ctx.createLinearGradient(
      0,
      progressY,
      0,
      progressY + progressHeight
    );
    shineGradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    shineGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    shineGradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");
    ctx.fillStyle = shineGradient;
    ctx.fillRect(progressX, progressY, fillWidth, progressHeight);

    ctx.restore();
  }

  // Progress percentage text (positioned better)
  ctx.fillStyle = colors.foreground;
  ctx.font = "600 15px sans-serif";
  const percentText = `${Math.floor(progress * 100)}%`;
  const percentWidth = ctx.measureText(percentText).width;
  const percentX =
    progress > 0.15
      ? progressX + progressWidth * progress - percentWidth - 12
      : progressX + progressWidth - percentWidth - 12;
  ctx.fillText(percentText, percentX, progressY + 19);

  // XP needed text below progress bar
  const xpNeeded = requiredXP - currentXP;
  if (xpNeeded > 0) {
    ctx.fillStyle = colors.dimText;
    ctx.font = "400 14px sans-serif";
    const neededText = `${xpNeeded.toLocaleString()} XP to next level`;
    ctx.fillText(neededText, progressX, progressY + progressHeight + 22);
  }

  return canvas.toBuffer("image/png");
}

// Helper functions for rounded rectangles
function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient
) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function drawRoundedRectStroke(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function roundedRectPath(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Example usage:
// const cardBuffer = await generateXPCard({
//   avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
//   username: user.username,
//   currentXP: 13,
//   requiredXP: 500,
//   level: 0,
//   rank: 42, // Optional
//   totalUsers: 1523, // Optional
// });
//
// // In a Discord.js bot:
// const attachment = new AttachmentBuilder(cardBuffer, { name: 'xp-card.png' });
// await interaction.reply({ files: [attachment] });

export async function findNextLevel(
  levelId: string,
  guildId: string
): Promise<[GuildLevelSelect, GuildLevelSelect] | null> {
  const current = await db
    .select()
    .from(guildLevel)
    .where(and(eq(guildLevel.guildId, guildId), eq(guildLevel.id, levelId)));
  console.log(current, guildId, levelId);
  if (!current || !current[0]) return null;

  const levels = await db
    .select()
    .from(guildLevel)
    .where(eq(guildLevel.guildId, guildId));

  const sortedLevels =
    levels && levels.length > 0
      ? levels.sort(
          (a, b) => (a.xpRequired as number) - (b.xpRequired as number)
        )
      : [];

  const currentIndex = sortedLevels.indexOf(
    sortedLevels.find((f) => f.id === current[0].id) as GuildLevelSelect
  );
  const nextLevel =
    currentIndex === sortedLevels.length
      ? sortedLevels[currentIndex]
      : sortedLevels[currentIndex + 1];

  return [current[0] as unknown as GuildLevelSelect, nextLevel];
}
