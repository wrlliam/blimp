import { capitlize, cn } from "@/lib/utils";

export default function DefaultInput(props: {
  title: string;
  className?: string;
  children: React.ReactElement | React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <h1 className="text-sm font-semibold">{capitlize(props.title)}</h1>
      {props.children}
    </div>
  );
}
