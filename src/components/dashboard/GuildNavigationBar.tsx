import ProductionAvatarTransparent from "@/assets/AVATAR_PROD-TRANSPARENT.png";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar } from "../ui/avatar";
import { UserAvatar } from "../Avatar";
import { useUserStore } from "@/lib/stores";
import { authClient } from "@/lib/auth/client";
import { HomeIcon, UserX2Icon } from "lucide-react";
import { capitlize } from "@/lib/utils";

type DropdownOption = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactElement;
};
const DROPDOWN_OPTIONS = [
  {
    label: "home",
    href: "/dashboard",
    icon: <HomeIcon className="h-[15px] opacity-20" />,
  },
  {
    label: "logout",
    onClick: async () => {
      await authClient.signOut();
      window.location.href = "/"
    },
    icon: <UserX2Icon className="h-[15px] opacity-20" />,
  },
] as DropdownOption[];

export default function GuildNavigationBar() {
  const { user } = useUserStore();

  return (
    user && (
      <div className="flex flex-row justify-between py-2 px-4 w-full bg-dark-foreground border-b border-blimp-border">
        <div className="flex items-center justify-center">
          <Image
            width={50}
            src={ProductionAvatarTransparent}
            alt="Transparent variation of Blimp's production logo"
          />
          <h1 className="font-semibold text-sm">Blimp</h1>
        </div>

        <div className="flex justify-between items-center">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <UserAvatar
                size={30}
                className="cursor-pointer"
                id={user.user_id}
                iconHash={user?.image}
                name={user.name}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-blimp-active  relative w-fit mr-4 mt-2 flex flex-col gap-1 border border-blimp-border p-1 shadow-lg">
              {DROPDOWN_OPTIONS.map((o, i) => (
                <a
                  key={i}
                  href={o.href ? o.href : undefined}
                  onClick={() => {
                    if(o.onClick) [
                        o.onClick()
                    ]
                  }}
                  className="flex cursor-pointer justify-start bg-transparent hover:bg-dark-foreground smooth_transition p-2 items-center gap-2 w-[10vw]"
                >
                  {o.icon}
                  <p className="text-xs">{capitlize(o.label)}</p>
                </a>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  );
}
