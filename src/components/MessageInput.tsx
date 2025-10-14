import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { Textarea } from "./ui/textarea";
import EmbedCreator from "./EmbedCreator";
import { Dispatch, SetStateAction } from "react";
import { APIEmbed } from "discord.js";

export type MessageInputProps = {
  message: string;
  setMessage: React.Dispatch<SetStateAction<string>>;

  embed: APIEmbed | undefined;
  setEmbed: React.Dispatch<SetStateAction<APIEmbed | undefined>>;
};

export default function MessageInput({
  embed,
  message,
  setMessage,
  setEmbed,
  ...props
}: MessageInputProps) {
  return (
    <Tabs defaultValue="message" className="mb-[2rem]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger className="cursor-pointer" value="message">
          Message
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="embed">
          Embed
        </TabsTrigger>
      </TabsList>
      <TabsContent className="h-full " value="message">
        <Textarea
          value={message}
          className={`min-h-[200px] ${message && message.length >= 1 ? "border-green-500/20" : "border-red-500/20"}`}
          onChange={(e) => setMessage(e.target.value)}
        />
      </TabsContent>
      <TabsContent value="embed">
        <EmbedCreator setState={setEmbed} state={embed} />
      </TabsContent>
    </Tabs>
  );
}
