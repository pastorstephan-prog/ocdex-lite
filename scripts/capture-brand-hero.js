const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "docs", "assets");
const outputPath = path.join(assetsDir, "ocdex-lite-hero.png");

function assetDataUrl(file, mime) {
  const data = fs.readFileSync(file).toString("base64");
  return `data:${mime};base64,${data}`;
}

async function launchBrowser() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chromePath)) return chromium.launch({ executablePath: chromePath });
  return chromium.launch();
}

function html() {
  const wordmark = assetDataUrl(path.join(publicDir, "brand-wordmark.png"), "image/png");
  const mark = assetDataUrl(path.join(publicDir, "brand-mark.svg"), "image/svg+xml");
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1600px;
        height: 900px;
        overflow: hidden;
        font-family: "Avenir Next", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif;
        color: #21485b;
        background: #f7f0e2;
      }
      .canvas {
        position: relative;
        width: 1600px;
        height: 900px;
        padding: 72px 82px;
        background:
          linear-gradient(116deg, #fff9ee 0%, #f4efe4 46%, #e8f1ef 100%);
      }
      .canvas::before {
        content: "";
        position: absolute;
        inset: 28px;
        border: 2px solid rgba(35, 68, 87, 0.08);
        border-radius: 42px;
        pointer-events: none;
      }
      .left {
        position: relative;
        z-index: 2;
        width: 710px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-bottom: 18px;
      }
      .logo-row {
        display: flex;
        align-items: center;
        gap: 22px;
        margin-bottom: 18px;
      }
      .mark {
        width: 94px;
        height: 94px;
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(124, 85, 51, 0.16);
      }
      .wordmark {
        width: 520px;
        height: auto;
        transform: translateY(2px);
      }
      h1 {
        margin: 16px 0 16px;
        font-size: 68px;
        line-height: 1.08;
        letter-spacing: 0;
        color: #17384b;
      }
      .lead {
        margin: 0 0 34px;
        max-width: 620px;
        color: #55707a;
        font-size: 28px;
        line-height: 1.55;
        font-weight: 650;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        max-width: 640px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 46px;
        padding: 0 18px;
        border: 1px solid rgba(47, 111, 151, 0.18);
        border-radius: 999px;
        background: rgba(255, 253, 248, 0.74);
        color: #31586a;
        font-size: 20px;
        font-weight: 700;
        box-shadow: 0 10px 28px rgba(35, 68, 87, 0.08);
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #e07b63;
      }
      .dot.teal { background: #72bebd; }
      .dot.green { background: #6e8b5e; }
      .right {
        position: absolute;
        z-index: 3;
        right: 72px;
        top: 74px;
        width: 785px;
        height: 752px;
      }
      .ipad, .phone {
        position: absolute;
        background: #1f2933;
        box-shadow: 0 32px 76px rgba(28, 54, 67, 0.24);
      }
      .ipad {
        left: 0;
        top: 58px;
        width: 690px;
        height: 512px;
        border-radius: 34px;
        padding: 18px;
      }
      .phone {
        right: 0;
        bottom: 2px;
        width: 288px;
        height: 588px;
        border-radius: 44px;
        padding: 16px;
      }
      .screen {
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 22px;
        background: #fbfaf4;
      }
      .phone .screen { border-radius: 32px; }
      .ipad-ui {
        display: grid;
        grid-template-columns: 185px 1fr;
        height: 100%;
      }
      .side {
        padding: 24px 18px;
        background: linear-gradient(180deg, #e8f0ef, #faf2e4);
        border-right: 1px solid #d5e2e4;
      }
      .side-title {
        margin: 0 0 22px;
        font-size: 20px;
        font-weight: 800;
      }
      .nav-line {
        height: 30px;
        margin: 10px 0;
        border-radius: 9px;
        background: rgba(47, 111, 151, 0.08);
      }
      .nav-line.short { width: 72%; }
      .thread-pill {
        margin-top: 34px;
        padding: 11px 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.64);
        color: #31586a;
        font-weight: 750;
      }
      .chat {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 22px;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 16px;
        border-bottom: 1px solid #d9e2e3;
      }
      .top strong {
        font-size: 22px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: #e9f5f4;
        color: #2f8c87;
        font-size: 15px;
        font-weight: 800;
      }
      .status::before {
        content: "";
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: currentColor;
      }
      .messages {
        flex: 1;
        padding-top: 30px;
      }
      .bubble {
        width: fit-content;
        max-width: 82%;
        margin: 0 0 18px;
        padding: 16px 18px;
        border-radius: 18px;
        font-size: 18px;
        line-height: 1.45;
      }
      .user {
        margin-left: auto;
        background: #2f6f97;
        color: #fffdf8;
        border-bottom-right-radius: 6px;
      }
      .assistant {
        background: #fffdf8;
        border: 1px solid #dbe5e4;
        color: #254c60;
        border-bottom-left-radius: 6px;
      }
      .composer {
        min-height: 74px;
        border: 1px solid #cadde0;
        border-radius: 18px;
        background: rgba(255, 253, 248, 0.96);
        box-shadow: 0 18px 42px rgba(47, 111, 151, 0.12);
        padding: 14px 16px;
        color: #84939a;
        font-size: 17px;
      }
      .phone-head {
        padding: 24px 22px 14px;
        border-bottom: 1px solid #e0e5e3;
      }
      .phone-head h2 {
        margin: 0;
        font-size: 25px;
        letter-spacing: 0;
      }
      .phone-head p {
        margin: 6px 0 0;
        color: #6c7f86;
        font-size: 14px;
        font-weight: 700;
      }
      .phone-body {
        padding: 22px;
      }
      .phone .bubble {
        max-width: 100%;
        font-size: 16px;
        margin-bottom: 14px;
      }
      .phone-state {
        margin-top: 150px;
        height: 42px;
        border: 1px solid #bee0e1;
        border-radius: 999px;
        color: #2f8c87;
        background: #edf8f7;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
        font-size: 15px;
        font-weight: 800;
      }
      .phone-state::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: currentColor;
      }
      .phone-compose {
        position: absolute;
        left: 32px;
        right: 32px;
        bottom: 32px;
        height: 96px;
        border: 1px solid #d6ddd9;
        border-radius: 24px;
        background: #fffdf8;
        box-shadow: 0 14px 34px rgba(35, 68, 87, 0.12);
        padding: 16px;
        color: #889096;
        font-size: 15px;
      }
      .stripe {
        position: absolute;
        left: 90px;
        bottom: 54px;
        width: 220px;
        height: 12px;
        border-radius: 999px;
        background: #e07b63;
        transform: rotate(-5deg);
        opacity: 0.78;
      }
      .caption {
        position: absolute;
        left: 86px;
        bottom: 58px;
        color: #6f7e83;
        font-size: 20px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="left">
        <div class="logo-row">
          <img class="mark" src="${mark}" alt="" />
          <img class="wordmark" src="${wordmark}" alt="Ocdex Lite" />
        </div>
        <h1>MacのCodexを<br />iPhone/iPadから。</h1>
        <p class="lead">ローカル優先、軽量PWA。外出先でも、Macに置いたCodex作業を止めずに続ける。</p>
        <div class="badges">
          <span class="badge"><span class="dot teal"></span>Mobile Codex Remote</span>
          <span class="badge"><span class="dot"></span>Lite PWA</span>
          <span class="badge"><span class="dot green"></span>LAN / VPN / Tailscale</span>
        </div>
      </div>
      <div class="right">
        <div class="ipad">
          <div class="screen ipad-ui">
            <div class="side">
              <p class="side-title">Ocdex Lite</p>
              <div class="nav-line"></div>
              <div class="nav-line short"></div>
              <div class="nav-line"></div>
              <div class="thread-pill">Codex remote</div>
            </div>
            <div class="chat">
              <div class="top">
                <strong>Ocdex Lite live chat</strong>
                <span class="status">待機中</span>
              </div>
              <div class="messages">
                <div class="bubble user">iPadから続きの作業を頼む。</div>
                <div class="bubble assistant">了解。Mac側のプロジェクトをそのまま使って進めます。</div>
              </div>
              <div class="composer">フォローアップの変更を求める</div>
            </div>
          </div>
        </div>
        <div class="phone">
          <div class="screen">
            <div class="phone-head">
              <h2>Ocdex Lite</h2>
              <p>2端末 / New project 2</p>
            </div>
            <div class="phone-body">
              <div class="bubble user">このスクショを確認して。</div>
              <div class="bubble assistant">小さな変更ならこのまま送れます。</div>
              <div class="phone-state">待機中</div>
            </div>
            <div class="phone-compose">Codexに頼むことを書く</div>
          </div>
        </div>
      </div>
      <div class="stripe"></div>
      <div class="caption">Unofficial local-first bridge for Codex CLI</div>
    </div>
  </body>
</html>`;
}

async function run() {
  fs.mkdirSync(assetsDir, { recursive: true });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(html(), { waitUntil: "load" });
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
