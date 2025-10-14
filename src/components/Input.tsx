import { capitlize } from "@/lib/utils";

export default function DefaultInput(props: {
    title: string;
    children: React.ReactElement | React.ReactNode
}) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-sm font-semibold">{capitlize(props.title)}</h1>
        {props.children}
      </div>
    );
}