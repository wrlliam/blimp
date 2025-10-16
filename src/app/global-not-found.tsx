"use client";

import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";

export default function GlobalNotFound() {
  const params = useParams();
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <h1>Unable to find page</h1>
      <p>
        It seemed this page doenst exist, please return to the inital dashboard.
      </p>
      <Button asChild>
        <a href={`/dashboard/`}>Return Home</a>
      </Button>
    </div>
  );
}
