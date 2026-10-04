import type { ComponentProps } from "react";
import { Modal } from "@/components/ui/modal";
import { ManualTrigger } from "../ManualTrigger";

type ManualTriggerProps = ComponentProps<typeof ManualTrigger>;

interface RunSheetProps extends Omit<ManualTriggerProps, "initialMode" | "allowBulk" | "demoNote"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "bulk";
  canExecute: boolean;
  /** Runs per hour a demo viewer may start, or null when this is not a demo viewer. */
  demoRuns: number | null;
}

/** Running a check is an occasional action, so it lives in a sheet. */
export function RunSheet({ open, onOpenChange, mode, canExecute, demoRuns, ...triggerProps }: RunSheetProps) {
  const { language } = triggerProps;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={language === "zh" ? "执行检查" : "Run a check"}>
      <ManualTrigger
        key={mode}
        initialMode={canExecute ? mode : "single"}
        allowBulk={canExecute}
        demoNote={
          demoRuns === null
            ? undefined
            : language === "zh"
              ? `演示工作区：查看者可以执行示例检查，每小时最多 ${demoRuns} 次。`
              : `Demo workspace: viewers can run the sample checks, up to ${demoRuns} times an hour.`
        }
        {...triggerProps}
      />
    </Modal>
  );
}
