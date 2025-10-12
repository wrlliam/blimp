import Image from "next/image";
import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn, formatNameForAvatar } from "@/lib/utils";
type AvatarProps = {
  name: string;
  iconHash: string | null | undefined;
  id: string;
  className?: string;
  size?: number;
};

export function GuildAvatar({
  name,
  id,
  iconHash,
  size = 50,
  ...props
}: AvatarProps) {
  return (
    <ShadAvatar
      className={cn(props.className, "bg-default-accent")}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {iconHash && (
        <AvatarImage
          src={`https://cdn.discordapp.com/icons/${id}/${iconHash as string}.${(iconHash as string).startsWith("a_") ? "gif" : "png"}?size=4096`}
          alt={`${name} icon`}
          width={size}
          height={size}
        />
      )}
      <AvatarFallback className="bg-default-accent text-sm flex items-center justify-center">
        {formatNameForAvatar(name)}
      </AvatarFallback>
    </ShadAvatar>
  );
}

// https://cdn.discordapp.com/avatars/1283484433390895215/bca946cb71b7e7aaa2b3fdb9d85a7912.png?size=4096
export function UserAvatar({ name, id, iconHash, size = 25, ...props }: AvatarProps) {
  return (
    <ShadAvatar
      className={cn(props.className, "bg-default-accent")}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {iconHash && (
        <AvatarImage
          src={`https://cdn.discordapp.com/avatars/${id}/${iconHash as string}.${(iconHash as string).startsWith("a_") ? "gif" : "png"}?size=4096`}
          alt={`${name} icon`}
          width={size}
          height={size}
        />
      )}
      <AvatarFallback className="bg-default-accent text-sm flex items-center justify-center">
        {formatNameForAvatar(name)}
      </AvatarFallback>
    </ShadAvatar>
  );
}
