"use client";

import DefaultInput from "@/components/Input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { env } from "@/env";
import { StarboardsSelect } from "@/lib/db/difference";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Starboard() {
  const { user } = useUserStore();
  const { guild } = useGuildStore();

  const [starboardData, setStarboardData] = useState<StarboardsSelect[]>([]);
  const [createData, setCreateData] = useState<Partial<StarboardsSelect>>({
    name: ""
  });

  const { mutateAsync: fetchStarboardAsync } = useMutation({
    mutationKey: ["fetchStarboardData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        data: StarboardsSelect[];
      }>(`${env.NEXT_PUBLIC_API_URL}/modules/starboard/${guild?.id}/`, {
        method: "GET",
        headers: {
          "bearer-user-id": `${user?.user_id}`,
          "bearer-authorization": `${user?.authentication_token}`,
        },

        onRequest: () => {
          console.log(`Sending request to /modules/starboard/${guild?.id}/`);
        },
        onError: (error: any) => {
          console.error("API request failed:", error);
          toast.error(
            "Failed to fetch starboard data, please refresh to try again."
          );
        },
      }),
  });

  useEffect(() => {
    (async () => {
      const data = await fetchStarboardAsync();
      if (data && data.data) {
        // console.log(data.data.data);
        setStarboardData(data.data.data as StarboardsSelect[]);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Starboard Configuration</CardTitle>
        <CardDescription className="w-[500px]">
          Custom commands let you tailor responses for your server. Set them up
          once, and members can use them anytime with your chosen prefix—simple,
          flexible, and fully in your hands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={"main"}>Create Starboard</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Starboard</DialogTitle>
            </DialogHeader>
            <CreateOrUpdate state={createData} setState={setCreateData} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

type CreateOrUpdateProps = {
  state: Partial<StarboardsSelect>;
  setState: Dispatch<SetStateAction<Partial<StarboardsSelect>>>;
};

function CreateOrUpdate(props: CreateOrUpdateProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-3">
        <DefaultInput className="w-full" title="Title">
          <Input
            className="w-full"
            value={props.state.name as string}
            onChange={(e) =>
              props.setState({
                ...props.state,
                name: e.target.value,
              })
            }
          />
        </DefaultInput>
      </div>
    </div>
  );
}
