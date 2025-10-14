import { useAvailableGuildStore, useGuildStore } from "@/lib/stores";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenu,
} from "../ui/dropdown-menu";
import { Guild } from "discord.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Image from "next/image";
import { GuildAvatar } from "../Avatar";
import {
  Blocks,
  ChevronsUp,
  Cog,
  Command,
  Folder,
  Hand,
  Layers,
  MessageSquare,
  SeparatorHorizontal,
  ShieldPlus,
  SmilePlus,
  Stars,
  TicketCheck,
  User,
} from "lucide-react";
import { capitlize, limitSentence } from "@/lib/utils";
import { Accordion } from "@radix-ui/react-accordion";
import { Badge } from "../ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export const TABS = {
  all: [
    {
      name: "Dashboard",
      href: "/",
      icon: <Blocks width={15} height={15} />,
      pro: false,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Cog width={15} height={15} />,
      pro: false,
    },
    {
      name: "Subscription",
      href: "/subscription",
      icon: <Stars width={15} height={15} />,
      pro: false,
    },
  ],
  engagement: [
    {
      name: "Welcome & Goodbye",
      href: "/welcome-and-goodbye",
      icon: <Hand width={15} height={15} />,
      pro: false,
    },
    {
      name: "Embed & Messages",
      href: "/embed-and-messages",
      icon: <MessageSquare width={15} height={15} />,
      pro: false,
    },
    {
      name: "Leveling",
      href: "/leveling",
      icon: <ChevronsUp width={15} height={15} />,
      pro: false,
    },
  ],
  management: [
    {
      name: "Logging",
      href: "/logging",
      icon: <Folder width={15} height={15} />,
      pro: false,
    },
    {
      name: "Moderation",
      href: "/leveling",
      icon: <ShieldPlus width={15} height={15} />,
      pro: false,
    },
    {
      name: "Commands",
      href: "/commands",
      icon: <Command width={15} height={15} />,
      pro: false,
    },
  ],
  utilites: [
    {
      name: "Reaction Roles",
      href: "/reaction-roles",
      icon: <SmilePlus width={15} height={15} />,
      pro: false,
    },
    {
      name: "Custom Commands",
      href: "/custom-commands",
      icon: <Layers width={15} height={15} />,
      pro: false,
    },
    {
      name: "Ticketing",
      href: "/tickets",
      icon: <TicketCheck width={15} height={15} />,
      pro: false,
    },
  ],
};

export type GuildSidebarProps = {
  guild: Guild;
};

export default function GuildSidebar(props: GuildSidebarProps) {
  const { guilds } = useAvailableGuildStore();
  return (
    <div className="flex flex-col w-[20vw] border-r border-blimp-border bg-dark-foreground h-[100vh] p-1 overflow-y-scroll overflow-x-hidden">
      <GuildSidebarSelector guild={props.guild} guilds={guilds as Guild[]} />
      <GuildSidebarModules guild={props.guild} />
    </div>
  );
}

export function GuildSidebarModules(props: GuildSidebarProps) {
  return (
    <Accordion type="multiple" defaultValue={[...Object.keys(TABS)]}>
      {Object.keys(TABS).map((k, i) => {
        if (k.toLowerCase() === "all") {
          return (
            <div key={i} className="flex flex-col gap-2 mt-[1rem] mb-[1rem]">
              {TABS[k as keyof typeof TABS].map((tab, i) => {
                return (
                  <a
                    href={`/dashboard/${props.guild.id}${tab.href}`}
                    key={i}
                    className={`flex mx-2 flex-row justify-between items-center p-2 group bg-transparent hover:bg-gray-200/5 rounded-md smooth_transition `}
                  >
                    <div className="flex items-center gap-2 opacity-65 group-hover:opacity-100 smooth_transition">
                      <span className="">{tab.icon}</span>
                      <p className="font-medium text-xs">
                        {capitlize(tab.name)}
                      </p>
                    </div>

                    {tab.pro && (
                      <div>
                        <Badge variant={"pro"}>Pro</Badge>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          );
        } else {
          return (
            <AccordionItem
              className=" border-none outline-none"
              key={i}
              value={k}
            >
              <AccordionTrigger className="cursor-pointer items-center flex justify-between border-none outline-none bg-transparent hover:bg-gray-100/5 p-2 pb-3 text-[10px]">
                <p className="mt-1">{k.toUpperCase()}</p>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 mt-[1rem]">
                {TABS[k as keyof typeof TABS].map((tab, i) => {
                  return (
                    <a
                      href={`/dashboard/${props.guild.id}${tab.href}`}
                      key={i}
                      className={`flex mx-2 flex-row justify-between p-2 group bg-transparent hover:bg-gray-200/5 rounded-md smooth_transition `}
                    >
                      <div className="flex items-center gap-2 opacity-65 group-hover:opacity-100 smooth_transition">
                        <span className="">{tab.icon}</span>
                        <p className="font-medium text-xs">
                          {capitlize(tab.name)}
                        </p>
                      </div>

                      {tab.pro && (
                        <div>
                          <Badge variant={"pro"}>Pro</Badge>
                        </div>
                      )}
                    </a>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        }
      })}
    </Accordion>
  );
}

export type GuildSidebarSelectorProps = {
  guild: Guild;
  guilds: Guild[];
};
export function GuildSidebarSelector({
  guild,
  guilds,
}: GuildSidebarSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-transparent outline-none w-full hover:bg-blimp-active smooth_transition cursor-pointer rounded-md shadow-none hover:shadow-md flex gap-3  items-center justify-between p-2 border border-transparent hover:border-blimp-border mt-1">
        <div className="flex flex-row gap-2 items-center w-full">
          <GuildAvatar
            size={35}
            className="rounded-md"
            iconHash={guild.icon}
            id={guild.id}
            name={guild.name}
          />
          <h1 className="text-sm font-semibold">
            {limitSentence(guild.name, 17)}
          </h1>
        </div>
        <div>
          <SeparatorHorizontal className="w-[20px] text-blimp-abstract-text" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="bg-blimp-active min-w-full relative w-full flex flex-col gap-2 border border-blimp-border p-1 shadow-lg">
        {guilds
          .filter((f) => f.id !== guild.id)
          .map((g, i) => (
            <a
              href={`/dashboard/${g.id}`}
              key={g.id}
              className="flex justify-start bg-transparent hover:bg-dark-foreground smooth_transition p-2 items-center gap-4 w-[13.75vw]"
            >
              <GuildAvatar
                size={25}
                className="rounded-md"
                iconHash={g.icon}
                id={g.id}
                name={g.name}
              />
              <div className="flex flex-col gap-1">
                <h1 className="text-xs font-semibold">
                  {limitSentence(g.name, 17)}
                </h1>
                {/* <p className="text-xs opacity-20">{g.memberCount} member(s)</p> */}
              </div>
            </a>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
