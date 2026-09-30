/**
 * Records the landing page's product video from a running Assay in demo mode:
 * a short title card, a scripted walk through the demo workspace with a drawn
 * cursor and captions, and a closing card. Frames come from the Chrome
 * screencast, so the video is as sharp as the page; ffmpeg turns them into
 * public/video/assay-demo.{mp4,webm} and a poster image.
 *
 * Usage: start the app with DEMO_MODE=true, then
 *   npm run demo:video -- [baseUrl] [en|zh]
 * Nothing is run or changed: the tour only reads pages.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const LANG = process.argv[3] === "zh" ? "zh" : "en";
const OUT_DIR = path.resolve("public/video");
const SUFFIX = LANG === "zh" ? "-zh" : "";
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 1.5;
const FPS = 30;

const COPY = {
  en: {
    introTitle: "Catch bad data before it ships.",
    introBody: "SQL checks that run on a schedule, read-only.",
    list: "Every check is a query that should return nothing.",
    filter: "Broken, flagged and clean, at a glance.",
    detail: "Open a check to see exactly which rows it found.",
    history: "Every run is kept, with what changed since the last one.",
    activity: "Changes land in one feed, and in Slack, Discord or Telegram.",
    analysis: "Pass rates and recurring problems over time.",
    outroTitle: "Try the live demo",
    outroBody: "assay.majincheng.com · open source",
  },
  zh: {
    introTitle: "在坏数据上线之前发现它。",
    introBody: "定时运行的只读 SQL 检查。",
    list: "每个检查都是一条应当返回空结果的查询。",
    filter: "出错、有问题、正常，一眼看清。",
    detail: "打开检查，看到它具体发现了哪些行。",
    history: "每次执行都有记录，以及和上次相比的变化。",
    activity: "变化汇总在一个动态流里，也会推送到 Slack、Discord 或 Telegram。",
    analysis: "随时间变化的通过率和反复出现的问题。",
    outroTitle: "试用在线演示",
    outroBody: "assay.majincheng.com · 开源",
  },
}[LANG];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A drawn cursor and a caption bar, since the screencast shows neither the real pointer nor narration. */
function overlayScript() {
  const install = () => {
    if (document.getElementById("__demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal { display: none !important; }
      #__demo-cursor { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none;
        transform: translate(-100px, -100px); filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      #__demo-ripple { position: fixed; z-index: 2147483646; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%;
        pointer-events: none; background: rgba(79,99,232,.28); transform: scale(0); opacity: 0; }
      #__demo-ripple.on { animation: __ripple .5s ease-out; }
      @keyframes __ripple { from { transform: scale(.2); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
      #__demo-caption { position: fixed; z-index: 2147483645; left: 50%; bottom: 28px; pointer-events: none;
        transform: translate(-50%, 12px); opacity: 0; transition: opacity .35s ease, transform .35s ease;
        padding: 12px 22px; border-radius: 999px; background: rgba(7,10,26,.92); color: #eef0ff;
        font: 500 17px/1.3 var(--font-geist), system-ui, sans-serif; letter-spacing: -0.01em; white-space: nowrap;
        box-shadow: 0 12px 32px -12px rgba(7,10,26,.5); }
      #__demo-caption.on { opacity: 1; transform: translate(-50%, 0); }
    `;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "__demo-cursor";
    cursor.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 11.5-6.6 1.1 3.9 7.3-2.9 1.5-3.9-7.4L4 21z" fill="#15161c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const ripple = document.createElement("div");
    ripple.id = "__demo-ripple";
    const caption = document.createElement("div");
    caption.id = "__demo-caption";
    document.body.append(ripple, caption, cursor);
    const at = window.__demoPointer ?? { x: -100, y: -100 };
    cursor.style.transform = `translate(${at.x - 3}px, ${at.y - 2}px)`;
    document.addEventListener("mousemove", (e) => {
      window.__demoPointer = { x: e.clientX, y: e.clientY };
      cursor.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`;
    });
    document.addEventListener("mousedown", (e) => {
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      ripple.classList.remove("on");
      void ripple.offsetWidth;
      ripple.classList.add("on");
    });
    window.__demoCaption = (text) => {
      caption.textContent = text ?? "";
      caption.classList.toggle("on", Boolean(text));
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}

/** A full-screen card on the night background with the beetle, for the opening and the close. */
async function showCard(page, title, body, iconSvg) {
  await page.evaluate(
    ([title, body, iconSvg]) => {
      document.getElementById("__demo-card")?.remove();
      const card = document.createElement("div");
      card.id = "__demo-card";
      card.innerHTML = `
        <style>
          #__demo-card { position: fixed; inset: 0; z-index: 2147483640; display: grid; place-items: center; background:
            radial-gradient(ellipse 70% 60% at 50% 38%, rgba(79,99,232,.35), transparent 70%), #070a1a; color: #eef0ff;
            font-family: var(--font-geist), system-ui, sans-serif; animation: __cardIn .6s ease both; }
          #__demo-card .inner { display: grid; justify-items: center; gap: 22px; text-align: center; }
          #__demo-card .mark { width: 92px; height: 92px; border-radius: 24px; background: #eef0fe; display: grid; place-items: center;
            box-shadow: 0 24px 60px -20px rgba(79,99,232,.8); animation: __pop .7s cubic-bezier(.2,.7,.2,1.2) both .1s; }
          #__demo-card .mark svg { width: 72px; height: 72px; }
          #__demo-card h1 { margin: 0; font-size: 56px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.05;
            animation: __rise .7s cubic-bezier(.2,.7,.2,1) both .3s; }
          #__demo-card p { margin: 0; font-size: 22px; color: #a9afd0; animation: __rise .7s cubic-bezier(.2,.7,.2,1) both .5s; }
          @keyframes __cardIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes __pop { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: scale(1) } }
          @keyframes __rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        </style>
        <div class="inner"><div class="mark">${iconSvg}</div><h1></h1><p></p></div>`;
      card.querySelector("h1").textContent = title;
      card.querySelector("p").textContent = body;
      document.body.appendChild(card);
    },
    [title, body, iconSvg],
  );
}

async function hideCard(page) {
  await page.evaluate(() => {
    const card = document.getElementById("__demo-card");
    if (!card) return;
    card.style.transition = "opacity .5s ease";
    card.style.opacity = "0";
    setTimeout(() => card.remove(), 600);
  });
}

const caption = (page, text) => page.evaluate((t) => window.__demoCaption?.(t), text);

/** Moves the pointer along an eased path, so the drawn cursor glides instead of jumping. */
async function glide(page, x, y, ms = 700) {
  const from = await page.evaluate(() => window.__demoPointer ?? { x: 640, y: 420 });
  const steps = Math.max(12, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
}

async function glideTo(page, locator, ms) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not visible: ${locator}`);
  await glide(page, box.x + Math.min(box.width / 2, 60), box.y + box.height / 2, ms);
}

async function clickOn(page, locator, ms) {
  await glideTo(page, locator, ms);
  await sleep(150);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}

/** Scrolls the app's main column smoothly. */
async function scrollMain(page, top, ms = 900) {
  await page.evaluate(
    ([top, ms]) =>
      new Promise((resolve) => {
        const main = document.getElementById("content") ?? document.scrollingElement;
        const start = main.scrollTop;
        const t0 = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          const e = 1 - Math.pow(1 - t, 3);
          main.scrollTop = start + (top - start) * e;
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    [top, ms],
  );
}

async function main() {
  const frameDir = mkdtempSync(path.join(tmpdir(), "assay-demo-"));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: "light", locale: LANG === "zh" ? "zh-CN" : "en-US" });
  await context.addInitScript(overlayScript);
  await context.addInitScript((lang) => {
    try {
      localStorage.setItem("assay-language", lang);
    } catch {}
  }, LANG);
  const page = await context.newPage();

  // Enter the demo as a guest before recording, so the first frame is already the app.
  await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/checks`, { waitUntil: "networkidle" });
  await page.locator(`table a[href="/checks/demo-duplicate-orders"]`).waitFor();
  const iconSvg = await (await fetch(`${BASE}/icon.svg`)).text();
  await page.mouse.move(900, 620);
  await showCard(page, COPY.introTitle, COPY.introBody, iconSvg);
  await sleep(300);

  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const file = path.join(frameDir, `${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });

  // 1. Title card, then the checks list.
  await sleep(2600);
  await hideCard(page);
  await sleep(700);
  await caption(page, COPY.list);
  await glide(page, 700, 330, 900);
  await sleep(1400);

  // 2. Filter by outcome and back.
  await caption(page, COPY.filter);
  await clickOn(page, page.getByRole("button", { name: /^(Issues|有问题)\s*\d+$/ }), 800);
  await sleep(1300);
  await clickOn(page, page.getByRole("button", { name: /^(Broken|出错)\s*\d+$/ }), 600);
  await sleep(1200);
  await clickOn(page, page.getByRole("button", { name: /^(All|全部)\s*\d+$/ }), 600);
  await sleep(900);

  // 3. Open a check with findings.
  await caption(page, COPY.detail);
  await clickOn(page, page.locator(`table a[href="/checks/demo-duplicate-orders"]`), 800);
  await page.getByRole("tab").first().waitFor();
  await sleep(1800);
  await glide(page, 760, 560, 900);
  await sleep(900);

  // 4. Run history.
  await caption(page, COPY.history);
  await clickOn(page, page.getByRole("tab", { name: /Run history|执行历史/ }), 700);
  await sleep(1800);
  await clickOn(page, page.getByRole("tab", { name: /Query|查询/ }), 700);
  await sleep(1800);

  // 5. Activity.
  await caption(page, COPY.activity);
  await clickOn(page, page.getByRole("link", { name: /^(Activity|动态)$/ }), 900);
  await page.waitForURL("**/activity");
  await sleep(2400);

  // 6. Analysis.
  await caption(page, COPY.analysis);
  await clickOn(page, page.getByRole("link", { name: /^(Analysis|分析)$/ }), 800);
  await page.waitForURL("**/data-analysis");
  await page.locator(".recharts-surface").first().waitFor();
  await sleep(1400);
  await scrollMain(page, 360, 1200);
  await sleep(1400);

  // 7. Closing card.
  await caption(page, null);
  await showCard(page, COPY.outroTitle, COPY.outroBody, iconSvg);
  await sleep(2800);

  await cdp.send("Page.stopScreencast");
  await browser.close();

  // The screencast only sends a frame when the page changes; hold each one until the next.
  const end = frames.at(-1).t + 0.5;
  const list = frames
    .map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`)
    .join("\n");
  const listFile = path.join(frameDir, "frames.txt");
  writeFileSync(listFile, `${list}\nfile '${frames.at(-1).file}'\n`);

  mkdirSync(OUT_DIR, { recursive: true });
  const size = `${VIEWPORT.width * SCALE}:${VIEWPORT.height * SCALE}`;
  const input = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile];
  const filter = ["-vf", `scale=${size}:flags=lanczos,fps=${FPS},format=yuv420p`];
  const mp4 = path.join(OUT_DIR, `assay-demo${SUFFIX}.mp4`);
  const webm = path.join(OUT_DIR, `assay-demo${SUFFIX}.webm`);
  execFileSync("ffmpeg", [...input, ...filter, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
  execFileSync("ffmpeg", [...input, ...filter, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", webm], { stdio: "inherit" });
  // The poster is the checks list, a moment after the title card fades.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "4.2", "-i", mp4, "-frames:v", "1", "-q:v", "3", path.join(OUT_DIR, `assay-demo${SUFFIX}.jpg`)], { stdio: "inherit" });
  rmSync(frameDir, { recursive: true, force: true });
  console.log(`Wrote ${mp4}, ${webm} and the poster from ${frames.length} frames.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
