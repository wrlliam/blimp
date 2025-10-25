import { BadgeQuestionMark, Cross } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

export default function VariableHelp() {
    return <Dialog>
        <DialogTrigger asChild>
            <Button variant={"ghost"} className="cursor-pointer"><BadgeQuestionMark/></Button>
        </DialogTrigger>
        <DialogContent>
            <DialogTitle>Message Variables</DialogTitle>

            
        </DialogContent>
    </Dialog>
}