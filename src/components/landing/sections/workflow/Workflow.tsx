import "./workflow.css";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { workflowCopy } from "./copy";
import { FrameMcp, FrameReview, FrameTriage, HeadLeader, TailLeader } from "./Frames";

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={back ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
}

/**
 * Section 5, workflow (box): a strip of three film frames threaded through a viewer gate on the lit box. Without
 * motion the frames lie side by side (a snap strip below 1240 px); workflow.motion.ts pulls the strip through the gate.
 */
export function Workflow() {
  const t = useCopy(workflowCopy);
  const ref = useMotion<HTMLElement>(() => import("./workflow.motion"));
  return (
    <section ref={ref} className="s-workflow" id="workflow" data-ground="box" aria-labelledby="wf-title">
      <div className="wf-opal" aria-hidden="true" />
      <div className="wf-dim" aria-hidden="true" />
      <div className="wf-head wrap">
        <h2 className="h2 wf-title" id="wf-title">
          {t.title}
        </h2>
        <p className="wf-lede">{t.lede}</p>
      </div>

      <div className="wf-viewport" data-wf-viewport="" tabIndex={0} aria-labelledby="wf-title">
        <ol className="wf-strip">
          <HeadLeader />
          <FrameReview />
          <FrameTriage />
          <FrameMcp />
          <TailLeader />
        </ol>
        {/* the viewer gate (desktop, with motion): a bridge carrying the counter, two jaws, four baked sprocket rollers */}
        <div className="wf-gate" aria-hidden="true">
          <span className="wf-bridge" />
          <span className="wf-jaw wf-jaw-l" />
          <span className="wf-jaw wf-jaw-r" />
          {["tl", "bl", "tr", "br"].map((corner) => (
            <span key={corner} className={`wf-roller wf-r-${corner}`}>
              <span />
            </span>
          ))}
        </div>
        <div className="wf-plate" role="group" aria-label={t.ctl.group}>
          <button className="wf-pbtn" type="button" data-wf-step="-1" aria-label={t.ctl.prev}>
            <Chevron back />
          </button>
          <span className="wf-counter" aria-hidden="true">
            <span className="wf-counter-k">FRAME</span>
            <span className="wf-reel-win">
              <span className="wf-reel">
                <span>1</span>
                <span>2</span>
                <span>3</span>
              </span>
            </span>
            <span className="wf-counter-of">/ 3</span>
          </span>
          <button className="wf-pbtn" type="button" data-wf-step="1" aria-label={t.ctl.next}>
            <Chevron />
          </button>
        </div>
      </div>

      <div className="wf-controls wrap" role="group" aria-label={t.ctl.group}>
        <button className="wf-ctl" type="button" data-wf-go="prev" aria-label={t.ctl.prev}>
          <Chevron back />
        </button>
        {[1, 2, 3].map((n) => (
          <button key={n} className="wf-ctl wf-num" type="button" data-wf-go={n} aria-controls={`wf-f${n}`} aria-current={n === 1 ? "true" : undefined}>
            {n}
          </button>
        ))}
        <button className="wf-ctl" type="button" data-wf-go="next" aria-label={t.ctl.next}>
          <Chevron />
        </button>
      </div>
    </section>
  );
}
