import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, Cell
} from "recharts";
import { supabase } from "./lib/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Key now comes from your .env file instead of being hardcoded — see setup notes.
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const VERSION = "2.1.0";
const LAUNCH_DATE = "Jun 26, 2025";

const COLORS = {
  bg: "#060912",
  surface: "#0b1120",
  card: "#0f1628",
  border: "#1a2540",
  borderHover: "#2a3a60",
  text: "#e2e8f0",
  muted: "#64748b",
  dim: "#384a6a",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  green: "#34d399",
  red: "#f87171",
  yellow: "#fbbf24",
  orange: "#f97316",
};

// ─── PORTFOLIO DATA ────────────────────────────────────────────────────────────
const PORTFOLIO1_TRADES = [
  { ticker:"VOO",   name:"Vanguard S&P 500 ETF",  buyPrice:575.20, allocation:20000, color:"#6366f1", buyDate:"Jun 26, 2025", type:"ETF",   sector:"Broad Market",  beta:1.00 },
  { ticker:"NVDA",  name:"NVIDIA Corp",            buyPrice:157.50, allocation:20000, color:"#10b981", buyDate:"Jun 26, 2025", type:"Stock", sector:"Technology",    beta:1.74 },
  { ticker:"AAPL",  name:"Apple Inc.",             buyPrice:200.50, allocation:15000, color:"#f59e0b", buyDate:"Jun 26, 2025", type:"Stock", sector:"Technology",    beta:1.24 },
  { ticker:"MSFT",  name:"Microsoft Corp",         buyPrice:440.00, allocation:20000, color:"#3b82f6", buyDate:"Jun 26, 2025", type:"Stock", sector:"Technology",    beta:0.90 },
  { ticker:"AMZN",  name:"Amazon.com",             buyPrice:208.00, allocation:15000, color:"#ef4444", buyDate:"Jun 26, 2025", type:"Stock", sector:"Consumer Disc.", beta:1.15 },
  { ticker:"BRK.B", name:"Berkshire Hathaway B",  buyPrice:463.00, allocation:10000, color:"#8b5cf6", buyDate:"Jun 26, 2025", type:"Stock", sector:"Financials",    beta:0.88 },
  { ticker:"META",  name:"Meta Platforms",         buyPrice:680.00, allocation:10000, color:"#ec4899", buyDate:"Oct 1, 2025",  type:"Stock", sector:"Technology",    beta:1.28 },
  { ticker:"GOOGL", name:"Alphabet Inc.",          buyPrice:310.00, allocation:10000, color:"#14b8a6", buyDate:"Feb 17, 2026", type:"Stock", sector:"Technology",    beta:1.05 },
  { ticker:"QQQ",   name:"Invesco Nasdaq-100 ETF", buyPrice:490.00, allocation:10000, color:"#f97316", buyDate:"May 1, 2026",  type:"ETF",   sector:"Broad Market",  beta:1.18 },
];

const PORTFOLIO1_FALLBACK = {
  VOO:685.46, NVDA:195.55, AAPL:312.66, MSFT:386.74,
  AMZN:242.67, "BRK.B":492.00, META:600.29, GOOGL:366.46, QQQ:533.00,
};

const PORTFOLIO2_TRADES = [
  { ticker:"TSLA", name:"Tesla Inc.",             buyPrice:311.21, allocation:25000, color:"#e11d48", buyDate:"Aug 1, 2026", type:"Stock", sector:"Consumer Disc.",          beta:2.05 },
  { ticker:"AMD",  name:"Advanced Micro Devices", buyPrice:485.39, allocation:25000, color:"#0ea5e9", buyDate:"Aug 1, 2026", type:"Stock", sector:"Technology",              beta:1.85 },
  { ticker:"JPM",  name:"JPMorgan Chase & Co.",   buyPrice:350.85, allocation:25000, color:"#a3e635", buyDate:"Aug 1, 2026", type:"Stock", sector:"Financials",              beta:1.10 },
  { ticker:"DIS",  name:"Walt Disney Co.",        buyPrice:96.19,  allocation:25000, color:"#fbbf24", buyDate:"Aug 1, 2026", type:"Stock", sector:"Communication Services",  beta:1.05 },
];

const PORTFOLIO2_FALLBACK = { TSLA:311.21, AMD:485.39, JPM:350.85, DIS:96.19 };

const PORTFOLIOS = {
  portfolio1: { key:"portfolio1", label:"Portfolio 1", trades:PORTFOLIO1_TRADES, fallback:PORTFOLIO1_FALLBACK, hasHistory:true, startDate:"2025-06-26" },
  portfolio2: { key:"portfolio2", label:"Portfolio 2", trades:PORTFOLIO2_TRADES, fallback:PORTFOLIO2_FALLBACK, hasHistory:false, startDate:"2026-08-01" },
};

const MONTHLY_HISTORY = [
  { month:"Jun '25", label:"Jun 26", VOO:575.20, NVDA:157.50, AAPL:200.50, MSFT:440.00, AMZN:208.00, "BRK.B":463.00, META:null,   GOOGL:null,   QQQ:null,   sp500:5460, note:"Portfolio launch. AAPL near 52-wk low. NVDA recovering from DeepSeek shock." },
  { month:"Jul '25", label:"Jul 31", VOO:587.60, NVDA:161.00, AAPL:211.00, MSFT:466.00, AMZN:218.00, "BRK.B":467.00, META:null,   GOOGL:null,   QQQ:null,   sp500:5578, note:"S&P +2.17%. Broad market recovery. MSFT momentum building." },
  { month:"Aug '25", label:"Aug 31", VOO:598.90, NVDA:170.00, AAPL:222.00, MSFT:490.00, AMZN:224.00, "BRK.B":471.00, META:null,   GOOGL:null,   QQQ:null,   sp500:5685, note:"META hits ATH $787. S&P +1.91%. AI boom accelerating." },
  { month:"Sep '25", label:"Sep 30", VOO:619.00, NVDA:176.00, AAPL:230.00, MSFT:512.00, AMZN:229.00, "BRK.B":474.00, META:null,   GOOGL:null,   QQQ:null,   sp500:5886, note:"S&P +3.53% — strongest month of 2025. All positions up." },
  { month:"Oct '25", label:"Oct 31", VOO:633.00, NVDA:186.00, AAPL:240.00, MSFT:535.00, AMZN:242.00, "BRK.B":478.00, META:703.00, GOOGL:null,   QQQ:null,   sp500:6020, note:"META added @ $680 (Oct 1). MSFT ALL-TIME HIGH $538.66 Oct 28." },
  { month:"Nov '25", label:"Nov 28", VOO:634.00, NVDA:189.00, AAPL:255.00, MSFT:510.00, AMZN:248.00, "BRK.B":480.00, META:690.00, GOOGL:null,   QQQ:null,   sp500:6028, note:"Info Tech worst month since March. Profit taking from Oct highs." },
  { month:"Dec '25", label:"Dec 31", VOO:632.50, NVDA:186.27, AAPL:271.36, MSFT:481.48, AMZN:250.00, "BRK.B":481.00, META:672.00, GOOGL:null,   QQQ:null,   sp500:6020, note:"2025 closes +16.39%. AAPL up 35% from purchase. Strong year." },
  { month:"Jan '26", label:"Jan 30", VOO:641.00, NVDA:188.62, AAPL:270.51, MSFT:471.00, AMZN:243.00, "BRK.B":481.00, META:660.00, GOOGL:null,   QQQ:null,   sp500:6110, note:"S&P +1.5%. Tariff fears building under surface." },
  { month:"Feb '26", label:"Feb 28", VOO:608.00, NVDA:174.00, AAPL:256.00, MSFT:432.00, AMZN:196.00, "BRK.B":476.00, META:580.00, GOOGL:310.00, QQQ:null,   sp500:5804, note:"GOOGL added @ $310 during selloff. S&P -5%. AMZN hits 52-wk low." },
  { month:"Mar '26", label:"Mar 31", VOO:572.00, NVDA:164.98, AAPL:248.00, MSFT:356.00, AMZN:198.00, "BRK.B":471.00, META:530.00, GOOGL:295.00, QQQ:null,   sp500:5470, note:"Liberation Day tariff shock. S&P -5.75%. MSFT near 52-wk low." },
  { month:"Apr '26", label:"Apr 30", VOO:631.00, NVDA:192.00, AAPL:274.00, MSFT:395.00, AMZN:240.00, "BRK.B":479.00, META:575.00, GOOGL:348.00, QQQ:null,   sp500:6040, note:"S&P +10.42%! Tariff walkback. Index crosses 7,000 on Apr 15." },
  { month:"May '26", label:"May 31", VOO:669.00, NVDA:232.00, AAPL:310.00, MSFT:413.00, AMZN:266.00, "BRK.B":487.00, META:610.00, GOOGL:395.00, QQQ:490.00, sp500:7413, note:"QQQ added @ $490. NVDA ATH $235.47 May 14. GOOGL ATH $402 May 13." },
  { month:"Jun '26", label:"Jun 30", VOO:678.00, NVDA:207.00, AAPL:302.00, MSFT:392.00, AMZN:248.00, "BRK.B":490.00, META:595.00, GOOGL:372.00, QQQ:516.00, sp500:7474, note:"Tech consolidates -1.1%. AAPL hits ATH $317.40 Jun 8." },
];

const MONTHLY_ANALYSIS = [
  { month:"Jun '25", spReturn:null, summary:"Portfolio launch day. You bought AAPL just 6 days after its 52-week low of $196.86 and NVDA near its 52-week low of $157.34, still recovering from the January DeepSeek AI shock. Excellent entry timing.", best:{ticker:"MSFT",reason:"Strong position ahead of its October ATH run"}, worst:{ticker:"NVDA",reason:"Still depressed from DeepSeek selloff"}, events:["AAPL hit 52-wk low $196.86 on Jun 20 — bought 6 days later","NVDA near its 52-wk low of $157.34","S&P 500 at 5,460"], change:null },
  { month:"Jul '25", spReturn:"+2.17%", summary:"A strong start. The S&P gained 2.17% as the market recovered from earlier tariff fears. All 6 positions moved higher. MSFT began its climb toward what would become an October all-time high.", best:{ticker:"MSFT",reason:"Up ~6% on the month, momentum building toward ATH"}, worst:{ticker:"BRK.B",reason:"Steady but slow — value stocks lagged growth"}, events:["S&P +2.17% — broad market recovery","Fed holds rates steady","Big Tech earnings beat across the board"], change:"+$4,200" },
  { month:"Aug '25", spReturn:"+1.91%", summary:"META hit an all-time high of $787.42 on August 12 — a stock you'd add just 7 weeks later at a better price. MSFT pushed toward $490. AI spending optimism drove the whole tech sector higher.", best:{ticker:"MSFT",reason:"Approaching all-time high territory near $490"}, worst:{ticker:"BRK.B",reason:"Value stocks lag in strong tech-driven months"}, events:["META hits ALL-TIME HIGH $787.42 on Aug 12","NVDA Blackwell chip deliveries on track","S&P +1.91%"], change:"+$3,800" },
  { month:"Sep '25", spReturn:"+3.53%", summary:"The strongest month of 2025. All positions surged. MSFT crossed $512 as enterprise AI adoption accelerated. AAPL gained on iPhone 17 pre-order momentum. Portfolio clearly ahead of $100K cost basis.", best:{ticker:"MSFT",reason:"Surged to $512 on AI cloud spending boom"}, worst:{ticker:"BRK.B",reason:"Still the slowest mover but steady"}, events:["S&P +3.53% — best month of 2025","NVDA-Intel AI partnership announced","Apple iPhone 17 pre-orders exceed expectations"], change:"+$6,100" },
  { month:"Oct '25", spReturn:"+2.27%", summary:"Peak month. MSFT hit its all-time high of $538.66 on October 28. You also added META on October 1 at $680 — buying the pullback after August's ATH. Portfolio hit its first major peak.", best:{ticker:"MSFT",reason:"ALL-TIME HIGH $538.66 Oct 28 — up 22% from your buy"}, worst:{ticker:"BRK.B",reason:"Defensive stocks lag in strong bull months"}, events:["MSFT ALL-TIME HIGH $538.66 Oct 28","Trade 2: META added @ $680 Oct 1","S&P crosses 6,000 for first time"], change:"+$5,800" },
  { month:"Nov '25", spReturn:"+0.13%", summary:"First warning sign. Info Tech had its worst month since March as investors took profits. MSFT fell from $538 ATH. META pulled back. However AAPL showed resilience, continuing its steady climb.", best:{ticker:"AAPL",reason:"Resilient during tech profit taking"}, worst:{ticker:"MSFT",reason:"Gave back gains from ATH — down ~$25 from peak"}, events:["Info Tech worst month since March 2025","Profit taking after October highs","S&P +0.13% — nearly flat"], change:"-$1,200" },
  { month:"Dec '25", spReturn:"-0.05%", summary:"Quiet end to 2025. AAPL closed the year at $271.36 — up 35% from your purchase price. NVDA confirmed its close at $186.27. The S&P ended 2025 up +16.39% — a great year.", best:{ticker:"AAPL",reason:"Up 35% from buy price — best of original 6"}, worst:{ticker:"META",reason:"Down from Oct entry of $680, now at $672"}, events:["S&P 500 closes 2025 up +16.39%","AAPL closes at $271.36 — up 35% from purchase","Fed signals slower rate cuts in 2026"], change:"-$200" },
  { month:"Jan '26", spReturn:"+1.5%", summary:"2026 started cautiously optimistic. S&P gained 1.5% but tariff concerns were building beneath the surface. MSFT continued its slide from the October ATH. META drifted lower.", best:{ticker:"VOO",reason:"Broad market gains carried the ETF higher"}, worst:{ticker:"MSFT",reason:"Continued slide from ATH — down ~$67 from peak"}, events:["Trump tariff threats escalate","MSFT continues post-ATH slide","Fed holds — signals caution on inflation"], change:"+$2,100" },
  { month:"Feb '26", spReturn:"-5.0%", summary:"First real scare. Tariffs triggered a broad -5% selloff. AMZN hit its 52-week low of $196. You made a smart contrarian move — adding GOOGL at $310 during the fear. Great entry.", best:{ticker:"BRK.B",reason:"Defensive value stock held better than tech"}, worst:{ticker:"AMZN",reason:"Hit 52-week low of $196 — down 5.8%"}, events:["S&P -5% on tariff fears","AMZN hits 52-wk low $196","Trade 3: GOOGL added @ $310 — contrarian buy"], change:"-$7,400" },
  { month:"Mar '26", spReturn:"-5.75%", summary:"The darkest month. Liberation Day tariff announcement caused a -5.75% S&P drop. MSFT hit 52-week low near $349. Portfolio briefly dipped close to cost basis. Staying in was the right call.", best:{ticker:"BRK.B",reason:"Buffett's holdings provided shelter"}, worst:{ticker:"MSFT",reason:"Hit 52-week low ~$349 — down 21% from buy"}, events:["Liberation Day tariff shock","S&P -5.75% — worst month since 2022","MSFT hits 52-wk low ~$349"], change:"-$9,800" },
  { month:"Apr '26", spReturn:"+10.42%", summary:"One of the greatest recoveries in recent history. Tariff walkback triggered a massive V-shaped rally. S&P +10.42%. Index crossed 7,000 for first time April 15. GOOGL (bought in fear) surged 18%.", best:{ticker:"GOOGL",reason:"Up 18% from $310 buy — tariff dip paying off"}, worst:{ticker:"META",reason:"Lagged the recovery — still below $680 entry"}, events:["Tariff walkback — markets explode","S&P +10.42% — one of best months in decades","S&P crosses 7,000 on Apr 15"], change:"+$18,200" },
  { month:"May '26", spReturn:"+5.0%", summary:"AI mania peaked. NVDA hit ATH $235.47 May 14 — up 49% from your buy. GOOGL hit ATH $402.38 May 13. AMZN hit ATH $278.56. You added QQQ on May 1 to ride momentum. Portfolio at its high.", best:{ticker:"NVDA",reason:"ALL-TIME HIGH $235.47 May 14 — up 49%"}, worst:{ticker:"META",reason:"Recovered to $610 but still below $680 entry"}, events:["NVDA ATH $235.47 May 14","GOOGL ATH $402.38 May 13","AMZN ATH $278.56 May 5","Trade 4: QQQ added @ $490 May 1"], change:"+$14,600" },
  { month:"Jun '26", spReturn:"-1.1%", summary:"Mild tech pullback after May highs. NVDA gave back 12% from ATH. But AAPL hit ATH $317.40 on June 8 — up 58% from your buy. S&P held well above 7,000. QQQ gained 5% in first full month.", best:{ticker:"AAPL",reason:"ATH $317.40 Jun 8 — up 58% from your buy"}, worst:{ticker:"NVDA",reason:"Pulled back 12% from ATH on profit taking"}, events:["AAPL ATH $317.40 Jun 8","NVDA -12% from ATH","S&P -1.1% healthy consolidation"], change:"+$2,800" },
];

const EDUCATION_CONTENT = [
  { id:"cagr", title:"CAGR", category:"Returns", icon:"📈", summary:"Compound Annual Growth Rate — the smoothed yearly return rate assuming reinvestment.", detail:"CAGR tells you: 'If my investment grew at a constant rate each year, what would that rate be?' It eliminates the noise of volatile monthly returns and gives a clean apples-to-apples comparison. Formula: (End Value / Start Value)^(1/years) - 1", example:"$100K → $150K over 3 years = CAGR of 14.47% per year", quiz:{q:"An investment doubles in 7 years. What is the approximate CAGR?", options:["7%","10.4%","14.3%","20%"], answer:1} },
  { id:"sharpe", title:"Sharpe Ratio", category:"Risk", icon:"⚖️", summary:"Measures return earned per unit of risk taken. Higher is better.", detail:"The Sharpe Ratio asks: 'Are you being compensated for the risk you're taking?' It divides excess return (above risk-free rate) by volatility. A Sharpe above 1.0 is generally good. Above 2.0 is excellent. Formula: (Portfolio Return - Risk Free Rate) / Standard Deviation", example:"Portfolio return 15%, risk-free 4%, std dev 10% → Sharpe = 1.1", quiz:{q:"Two portfolios both return 12%. Portfolio A has Sharpe of 0.8, Portfolio B has 1.4. Which is better?", options:["Portfolio A — higher absolute return","Portfolio B — better risk-adjusted","They're equal","Can't tell without more info"], answer:1} },
  { id:"beta", title:"Beta", category:"Risk", icon:"β", summary:"Measures how much your portfolio moves relative to the overall market.", detail:"A beta of 1.0 means your portfolio moves in lockstep with the S&P 500. Beta of 1.5 means if S&P drops 10%, you drop ~15%. Beta under 1 means less volatile than market. BRK.B (beta ~0.88) is more defensive. NVDA (beta ~1.74) is more aggressive.", example:"Portfolio beta 1.2 + S&P drops 10% = expect ~12% portfolio drop", quiz:{q:"Your portfolio has a beta of 0.75. The S&P 500 rises 20%. What would you expect?", options:["20% gain","15% gain","25% gain","Can't predict"], answer:1} },
  { id:"alpha", title:"Alpha", category:"Returns", icon:"α", summary:"The return your portfolio generates above what market exposure alone would predict.", detail:"Alpha is the holy grail. It's the 'skill' portion of your returns — what you earned beyond what a passive index fund would have delivered. Positive alpha means your stock picks outperformed. Negative alpha means you'd have done better just buying VOO.", example:"Portfolio +18%, S&P +15% (adjusted for beta) → Alpha = +3%", quiz:{q:"If your portfolio returns 12% and the market returns 12%, what is your alpha (simplified)?", options:["+12%","0%","-12%","Can't calculate"], answer:1} },
  { id:"drawdown", title:"Maximum Drawdown", category:"Risk", icon:"📉", summary:"The largest peak-to-trough decline your portfolio experienced.", detail:"Maximum Drawdown answers: 'What's the worst I would have felt holding this?' It measures the biggest drop from a portfolio's highest point to its lowest before recovering. Your portfolio experienced its worst drawdown during the March 2026 Liberation Day crash.", example:"Portfolio peaks at $140K, drops to $118K → Max Drawdown = -15.7%", quiz:{q:"Portfolio goes $100K → $130K → $105K → $145K. What is max drawdown?", options:["-15%","-19.2%","-28%","-5%"], answer:1} },
  { id:"diversification", title:"Diversification", category:"Strategy", icon:"🎯", summary:"Spreading investments across different assets to reduce risk without sacrificing return.", detail:"Diversification works because different assets don't move in perfect sync. When tech drops, defensive stocks like BRK.B hold up. Your portfolio has some diversification (ETFs + individual stocks) but is heavily concentrated in Technology sector (~65%+). True diversification would include bonds, international stocks, and real estate.", example:"Tech-only portfolio vs. Tech + Finance + Healthcare + Bonds portfolio — same return, much lower risk", quiz:{q:"Which portfolio is best diversified?", options:["10 tech stocks","5 stocks across 5 sectors","VOO + BND + International ETF","2 stocks"], answer:2} },
];

const CHANGELOG = [
  { version:"2.0.0", date:"Jul 2026", type:"major", notes:["Full platform rebuild — PortfolioTrack v2","Added AI Portfolio Assistant powered by Claude","Advanced analytics: CAGR, Sharpe, Beta, Alpha, Max Drawdown","Portfolio Health Score (0-100)","Education Center with interactive quizzes","Public roadmap and changelog","Sector allocation and diversification analysis","Comparison vs S&P 500 benchmark"] },
  { version:"1.1.0", date:"Jul 2026", type:"minor", notes:["Added Monthly Analysis tab with market narrative","Added Trade Log with rationale for each entry","Gradient header accent bar","Jon Ong branding and footer"] },
  { version:"1.0.0", date:"Jul 2026", type:"major", notes:["Initial launch of PortfolioTrack","9 positions across 4 trades","Month-by-month historical tracking","Holdings and overview tabs"] },
];

const ROADMAP = [
  { quarter:"Q3 2026", status:"current", items:["User portfolio builder (add your own stocks)","Real-time price alerts","PDF export of portfolio report","Mobile app (iOS)","Backfill Portfolio 2 monthly history to enable Sharpe/Alpha/Max Drawdown"] },
  { quarter:"Q4 2026", status:"planned", items:["Social portfolio sharing","Options tracking","Dividend reinvestment modeling","Tax loss harvesting calculator"] },
  { quarter:"Q1 2027", status:"future", items:["Multi-currency support","International markets","AI-powered rebalancing suggestions","Broker account integration"] },
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);
const pct = (n,d=2) => `${n>=0?"+":""}${n.toFixed(d)}%`;
const round2 = (n) => Math.round(n*100)/100;

function calcMonthlyPortfolioValues(trades) {
  return MONTHLY_HISTORY.map(m => {
    let val = 0;
    trades.forEach(t => { if(m[t.ticker]!==null && m[t.ticker]!==undefined) val += (t.allocation/t.buyPrice)*m[t.ticker]; });
    return { month:m.month, value:Math.round(val), sp500:m.sp500 };
  });
}

function calcCAGR(startVal, endVal, years) {
  return (Math.pow(endVal/startVal, 1/years) - 1) * 100;
}

function calcMaxDrawdown(values) {
  let maxDD = 0, peak = values[0];
  for(let v of values) {
    if(v > peak) peak = v;
    const dd = (v - peak) / peak;
    if(dd < maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

function calcSharpe(monthlyReturns, riskFreeAnnual=0.043) {
  const rf = riskFreeAnnual / 12;
  const excess = monthlyReturns.map(r => r - rf);
  const mean = excess.reduce((a,b)=>a+b,0)/excess.length;
  const variance = excess.reduce((a,b)=>a+(b-mean)**2,0)/(excess.length-1);
  const std = Math.sqrt(variance);
  return (mean / std) * Math.sqrt(12);
}

function calcBeta(holdings) {
  const totalVal = holdings.reduce((s,h)=>s+h.currentValue,0);
  return holdings.reduce((s,h)=> s + (h.beta*(h.currentValue/totalVal)), 0);
}

function calcHealthScore(holdings) {
  const totalVal = holdings.reduce((s,h)=>s+h.currentValue,0);
  const weights = holdings.map(h=>h.currentValue/totalVal);

  // Concentration (Herfindahl index)
  const hhi = weights.reduce((s,w)=>s+w*w,0);
  const concentrationScore = Math.max(0, Math.min(40, (1-hhi)*60));

  // Sector diversity
  const sectors = {};
  holdings.forEach((h,i)=>{ sectors[h.sector]=(sectors[h.sector]||0)+weights[i]; });
  const sectorCount = Object.keys(sectors).length;
  const maxSector = Math.max(...Object.values(sectors));
  const sectorScore = Math.min(30, sectorCount*5 + (1-maxSector)*20);

  // Asset type mix
  const etfWeight = holdings.filter(h=>h.type==="ETF").reduce((s,h,i)=>s+weights[holdings.indexOf(h)],0);
  const typeScore = Math.min(20, etfWeight*40);

  // Beta balance (closer to 1.0 is better for balanced portfolio)
  const beta = calcBeta(holdings);
  const betaScore = Math.max(0, 10 - Math.abs(beta-1)*10);

  return Math.round(concentrationScore + sectorScore + typeScore + betaScore);
}

async function fetchFinnhub(ticker, fallbackPrice) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    if(!res.ok) throw new Error("bad");
    const data = await res.json();
    if(data.c && data.c > 0) return { price:data.c, source:"live" };
    throw new Error("no price");
  } catch {
    return { price:fallbackPrice, source:"fallback" };
  }
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function StatCard({label, value, sub, color, size="md"}) {
  return (
    <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"14px 16px"}}>
      <div style={{fontSize:9,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:5}}>{label}</div>
      <div style={{fontSize:size==="lg"?24:18,fontWeight:700,color:color||COLORS.text,lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:COLORS.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

function Badge({text, color="#6366f1", bg="#1a1b4a"}) {
  return <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,background:bg,color,border:`1px solid ${color}33`,fontWeight:600,letterSpacing:"0.05em"}}>{text}</span>;
}

function SectionTitle({children, sub}) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:15,fontWeight:700,color:COLORS.text}}>{children}</div>
      {sub && <div style={{fontSize:11,color:COLORS.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activePortfolio, setActivePortfolio] = useState("portfolio1");
  const P = PORTFOLIOS[activePortfolio];
  const TRADES = P.trades;
  const FALLBACK = P.fallback;

  const [prices, setPrices] = useState(PORTFOLIO1_FALLBACK);
  const [priceStatus, setPriceStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState("landing");
  const [analysisIdx, setAnalysisIdx] = useState(MONTHLY_ANALYSIS.length-1);
  const [monthlyIdx, setMonthlyIdx] = useState(MONTHLY_HISTORY.length-1);
  const [eduIdx, setEduIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [aiMessages, setAiMessages] = useState([{role:"assistant", content:"Hi! I'm your AI Portfolio Assistant. I have full access to your portfolio data — ask me anything about your investments, returns, risks, or market events."}]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);

  // accounts / leaderboard
  const [user, setUser] = useState(null);
  const [myPortfolio, setMyPortfolio] = useState(null);
  const [communityCount, setCommunityCount] = useState(null);

  const fetchAll = useCallback(async (portfolioKey) => {
    const pf = PORTFOLIOS[portfolioKey];
    setLoading(true);
    const newPrices={...pf.fallback}, newStatus={};
    await Promise.all(pf.trades.map(async t => {
      const {price,source} = await fetchFinnhub(t.ticker, pf.fallback[t.ticker]);
      newPrices[t.ticker]=price; newStatus[t.ticker]=source;
    }));
    setPrices(newPrices); setPriceStatus(newStatus);
    setLastUpdated(new Date()); setLoading(false);
  }, []);

  useEffect(()=>{ fetchAll(activePortfolio); const i=setInterval(()=>fetchAll(activePortfolio),5*60*1000); return ()=>clearInterval(i); },[activePortfolio, fetchAll]);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[aiMessages]);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ if(data.session) loadMyPortfolio(data.session.user); });
    supabase.from("portfolios").select("*",{count:"exact",head:true}).then(({count})=>setCommunityCount(count??0));
  },[]);

  async function loadMyPortfolio(authedUser) {
    setUser(authedUser);
    const { data } = await supabase.from("portfolios").select("*").eq("user_id", authedUser.id).single();
    setMyPortfolio(data);
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setMyPortfolio(null);
  }

  // Derived data
  const holdings = TRADES.map(h => {
    const currentPrice=prices[h.ticker], shares=h.allocation/h.buyPrice;
    const currentValue=shares*currentPrice, gainLoss=currentValue-h.allocation;
    const pctChange=(gainLoss/h.allocation)*100;
    return {...h, currentPrice, shares, currentValue, gainLoss, pctChange};
  });

  const totalDeployed = TRADES.reduce((s,h)=>s+h.allocation,0);
  const totalCurrent = holdings.reduce((s,h)=>s+h.currentValue,0);
  const totalGL = totalCurrent-totalDeployed;
  const totalPct = (totalGL/totalDeployed)*100;
  const anyLive = Object.values(priceStatus).some(s=>s==="live");

  const monthlyVals = P.hasHistory
    ? calcMonthlyPortfolioValues(TRADES)
    : [{month:P.label+" Start", value:totalDeployed, sp500:null}];
  const chartData = P.hasHistory
    ? [...monthlyVals, {month:"Now", value:Math.round(totalCurrent), sp500:7537}]
    : [...monthlyVals, {month:"Now", value:Math.round(totalCurrent), sp500:null}];

  // Monthly returns for Sharpe (only meaningful once there's real history)
  const monthlyReturns = monthlyVals.slice(1).map((m,i)=>(m.value-monthlyVals[i].value)/monthlyVals[i].value);
  const portfolioBeta = calcBeta(holdings);
  const yearsHeld = P.hasHistory ? (13/12) : Math.max((new Date() - new Date(P.startDate)) / (1000*60*60*24*365.25), 1/365.25);
  const cagr = calcCAGR(totalDeployed, totalCurrent, yearsHeld);
  const sharpe = P.hasHistory && monthlyReturns.length > 1 ? calcSharpe(monthlyReturns) : null;
  const maxDD = P.hasHistory ? calcMaxDrawdown(monthlyVals.map(m=>m.value)) : null;
  const sp500Return = P.hasHistory ? ((7537-5460)/5460)*100 : null;
  const alpha = P.hasHistory ? totalPct - (sp500Return * portfolioBeta) : null;
  const healthScore = calcHealthScore(holdings);

  // Sector breakdown
  const sectors = {};
  holdings.forEach(h=>{ sectors[h.sector]=(sectors[h.sector]||0)+h.currentValue; });
  const sectorData = Object.entries(sectors).map(([name,val])=>({name, value:Math.round(val), pct:((val/totalCurrent)*100).toFixed(1)})).sort((a,b)=>b.value-a.value);

  // S&P comparison chart
  const sp500Normalized = chartData.map(m=>({month:m.month, portfolio:m.value?Math.round((m.value/totalDeployed)*100):null, sp500:m.sp500?Math.round((m.sp500/5460)*100):null}));

  const bestH = [...holdings].sort((a,b)=>b.pctChange-a.pctChange)[0];
  const worstH = [...holdings].sort((a,b)=>a.pctChange-b.pctChange)[0];

  // Health score breakdown
  const healthDetails = [
    { label:"Diversification", score:holdings.length>=7?22:15, max:25, note:holdings.length>=7?"Good — 9 positions across multiple types":"Consider adding more positions" },
    { label:"Sector Balance", score:Object.keys(sectors).length>=4?18:10, max:25, note:Object.keys(sectors).length>=4?"Multiple sectors represented":"Heavy Tech concentration — consider rebalancing" },
    { label:"Asset Mix (ETF/Stock)", score:holdings.filter(h=>h.type==="ETF").length>=2?20:12, max:25, note:"Good — ETFs provide broad market exposure" },
    { label:"Risk Level (Beta)", score:portfolioBeta<1.3?20:12, max:25, note:`Portfolio beta ${round2(portfolioBeta)} — ${portfolioBeta<1.2?"moderate risk":"slightly aggressive"}` },
  ];

  // AI Assistant
  const buildPortfolioContext = () => `
You are an AI assistant for PortfolioTrack, a personal investment dashboard belonging to Jon Ong.

PORTFOLIO SUMMARY (${P.label}):
- Total Deployed: $${totalDeployed.toLocaleString()} starting ${P.trades[0].buyDate}
- Current Value: $${Math.round(totalCurrent).toLocaleString()}
- Total Return: ${round2(totalPct)}% ($${Math.round(totalGL).toLocaleString()})
- CAGR: ${round2(cagr)}%
- Sharpe Ratio: ${sharpe===null?"not enough history yet":round2(sharpe)}
- Portfolio Beta: ${round2(portfolioBeta)}
- Alpha vs S&P 500: ${alpha===null?"not enough history yet":round2(alpha)+"%"}
- Maximum Drawdown: ${maxDD===null?"not enough history yet":round2(maxDD)+"%"}
- Portfolio Health Score: ${healthScore}/100
- S&P 500 return same period: ${sp500Return===null?"not enough history yet":round2(sp500Return)+"%"}

HOLDINGS (ticker: current return%):
${holdings.map(h=>`- ${h.ticker} (${h.name}): bought ${h.buyDate} @ $${h.buyPrice}, now $${round2(h.currentPrice)}, return: ${round2(h.pctChange)}%`).join("\n")}

SECTOR ALLOCATION:
${sectorData.map(s=>`- ${s.name}: ${s.pct}%`).join("\n")}
${P.hasHistory ? `
KEY MARKET EVENTS:
- Mar 2026: Liberation Day tariff crash, S&P -5.75%
- Apr 2026: Tariff walkback, S&P +10.42%
- May 2026: NVDA ATH $235.47, AAPL near ATH
- Jun 2026: Tech pullback, AAPL ATH $317.40` : ""}

Answer questions about this portfolio concisely and helpfully. Be specific with numbers. Keep responses under 200 words.
`;

  // NOTE: This calls the Anthropic API directly from the browser with no auth header and
  // no backend in front of it — it will fail as-is (401/CORS). A real Claude API key must
  // never be shipped in frontend code. This needs a small server-side proxy (a Vercel
  // serverless function or Supabase Edge Function) that holds the key and forwards the
  // request. Flagging this rather than silently leaving it looking functional.
  const sendAiMessage = async () => {
    if(!aiInput.trim()||aiLoading) return;
    const userMsg = {role:"user", content:aiInput};
    setAiMessages(prev=>[...prev,userMsg]);
    setAiInput(""); setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          system: buildPortfolioContext(),
          messages:[...aiMessages.filter(m=>m.role!=="assistant"||aiMessages.indexOf(m)>0), userMsg].map(m=>({role:m.role,content:m.content}))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      setAiMessages(prev=>[...prev,{role:"assistant",content:reply}]);
    } catch {
      setAiMessages(prev=>[...prev,{role:"assistant",content:"This assistant needs a backend proxy to reach Claude securely — that part isn't wired up yet. Ask Jon's dashboard maintainer to add a serverless endpoint that holds the API key server-side."}]);
    }
    setAiLoading(false);
  };

  const deployedAt = (m) => TRADES.reduce((s,h)=>m[h.ticker]!==null?s+h.allocation:s,0);

  // TAB STYLES
  const T = (id) => ({
    padding:"10px 14px", background:"none", border:"none",
    borderBottom:tab===id?"2px solid #6366f1":"2px solid transparent",
    color:tab===id?"#a5b4fc":COLORS.muted,
    cursor:"pointer", fontSize:12, fontWeight:tab===id?600:400, whiteSpace:"nowrap",
  });

  const TABS = [
    ["landing","Home"],["dashboard","Dashboard"],["analytics","Analytics"],
    ["health","Health Score"],["ai","AI Assistant"],["monthly","Monthly"],
    ["education","Learn"],["roadmap","Roadmap"],
    ["leaderboard","Leaderboard"],["myportfolio","My Portfolio"],
  ];

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:COLORS.bg,minHeight:"100vh",color:COLORS.text}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px #6366f133}50%{box-shadow:0 0 40px #6366f166}}
        .fade-in{animation:fadeIn 0.3s ease forwards}
        .tab-btn:hover{color:#94a3b8!important}
        .card-hover:hover{border-color:#2a3a60!important;transition:border-color 0.2s}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0b1120}
        ::-webkit-scrollbar-thumb{background:#1a2540;border-radius:2px}
      `}</style>

      {/* ── TOP GRADIENT BAR ── */}
      <div style={{height:3,background:"linear-gradient(90deg,#6366f1,#10b981,#f59e0b,#ef4444,#8b5cf6,#ec4899,#14b8a6,#f97316)"}} />

      {/* ── HEADER ── */}
      <div style={{background:COLORS.surface,borderBottom:`1px solid ${COLORS.border}`,padding:"16px 28px 0",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📊</div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:COLORS.text,letterSpacing:"-0.3px"}}>PortfolioTrack</div>
                <div style={{fontSize:10,color:COLORS.dim}}>by Jon Ong &nbsp;·&nbsp; v{VERSION} {communityCount!==null && `· ${communityCount} community ${communityCount===1?"portfolio":"portfolios"}`}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,padding:"3px 10px",borderRadius:20,background:loading?"#1a2540":anyLive?"#0a2a1a":"#1a2540",color:loading?COLORS.dim:anyLive?COLORS.green:COLORS.dim,border:`1px solid ${loading?"#1a2540":anyLive?"#1a3528":"#1a2540"}`}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:loading?COLORS.dim:anyLive?COLORS.green:COLORS.dim,animation:loading?"pulse 1.2s infinite":"none"}} />
                {loading?"Fetching…":anyLive?"Prices current":"Monthly data"}
              </div>
              {lastUpdated && !loading && <span style={{fontSize:10,color:COLORS.dim}}>{lastUpdated.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
              <button onClick={()=>fetchAll(activePortfolio)} disabled={loading} style={{fontSize:11,padding:"4px 12px",borderRadius:20,border:`1px solid ${COLORS.border}`,background:COLORS.card,color:COLORS.accent,cursor:"pointer",fontWeight:600}}>↻</button>
              {!loading && (
                <div style={{fontSize:13,fontWeight:800,color:totalGL>=0?COLORS.green:COLORS.red}}>
                  {fmt(totalCurrent)} <span style={{fontSize:11}}>{pct(totalPct)}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {Object.values(PORTFOLIOS).map(pf=>(
              <button key={pf.key} onClick={()=>setActivePortfolio(pf.key)} style={{
                padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                border:activePortfolio===pf.key?`1px solid ${COLORS.accent}`:`1px solid ${COLORS.border}`,
                background:activePortfolio===pf.key?"#191b4a":COLORS.card,
                color:activePortfolio===pf.key?COLORS.accentLight:COLORS.muted,
              }}>{pf.label}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:0,overflowX:"auto"}}>
            {TABS.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} className="tab-btn" style={T(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 28px 60px"}}>

        {/* ══════════════════════════════════════════════════════════════
            LANDING PAGE
        ══════════════════════════════════════════════════════════════ */}
        {tab==="landing" && (
          <div className="fade-in">
            {/* Hero */}
            <div style={{textAlign:"center",padding:"60px 20px 50px",position:"relative"}}>
              <div style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:COLORS.accent,marginBottom:16,fontWeight:600}}>Personal Investment Analysis Platform</div>
              <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:900,margin:"0 0 20px",color:COLORS.text,lineHeight:1.1,letterSpacing:"-1px"}}>
                Track. Analyze.<br/><span style={{background:"linear-gradient(135deg,#6366f1,#34d399)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Understand.</span>
              </h1>
              <p style={{fontSize:16,color:COLORS.muted,maxWidth:520,margin:"0 auto 32px",lineHeight:1.7}}>
                PortfolioTrack turns your real investment data into institutional-grade analysis — CAGR, Sharpe Ratio, Alpha, Beta, and AI-powered insights, all in one place.
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>setTab("dashboard")} style={{padding:"12px 28px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  View Dashboard →
                </button>
                <button onClick={()=>setTab("ai")} style={{padding:"12px 28px",borderRadius:10,background:COLORS.card,border:`1px solid ${COLORS.border}`,color:COLORS.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Ask AI Assistant
                </button>
              </div>
            </div>

            {/* Live stats bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:40}}>
              {[
                {label:"Portfolio Value", value:loading?"···":fmt(totalCurrent), color:COLORS.accentLight},
                {label:"Total Return", value:loading?"···":pct(totalPct), color:totalGL>=0?COLORS.green:COLORS.red},
                {label:"CAGR", value:loading?"···":`${round2(cagr)}%`, color:COLORS.yellow},
                {label:"Sharpe Ratio", value:loading?"···":round2(sharpe).toString(), color:COLORS.orange},
                {label:"Health Score", value:`${healthScore}/100`, color:healthScore>=70?COLORS.green:healthScore>=50?COLORS.yellow:COLORS.red},
                {label:"Portfolio Beta", value:loading?"···":round2(portfolioBeta).toString(), color:COLORS.accentLight},
              ].map((s,i)=>(
                <div key={i} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Feature grid */}
            <div style={{marginBottom:40}}>
              <div style={{fontSize:11,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.12em",textAlign:"center",marginBottom:24}}>Platform Features</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
                {[
                  {icon:"📊",title:"Advanced Analytics",desc:"CAGR, Sharpe Ratio, Beta, Alpha, Max Drawdown — the metrics professionals use, applied to your real portfolio.",tab:"analytics"},
                  {icon:"🏥",title:"Portfolio Health Score",desc:"A 0-100 score evaluating diversification, sector balance, concentration risk, and asset allocation with plain-English explanations.",tab:"health"},
                  {icon:"🤖",title:"AI Assistant",desc:"Ask questions about your portfolio in plain English. Why did it drop? How diversified am I? The AI knows your data.",tab:"ai"},
                  {icon:"📅",title:"Monthly Analysis",desc:"Detailed narrative of every month — best performer, worst performer, key market events, and portfolio impact.",tab:"monthly"},
                  {icon:"📚",title:"Education Center",desc:"Learn CAGR, Sharpe Ratio, Beta, Alpha, and Diversification with interactive examples and quizzes.",tab:"education"},
                  {icon:"🗺️",title:"Public Roadmap",desc:"See what's coming next, track development progress, and follow the changelog of every improvement.",tab:"roadmap"},
                ].map((f,i)=>(
                  <div key={i} className="card-hover" onClick={()=>setTab(f.tab)} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"20px",cursor:"pointer"}}>
                    <div style={{fontSize:24,marginBottom:10}}>{f.icon}</div>
                    <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:6}}>{f.title}</div>
                    <div style={{fontSize:12,color:COLORS.muted,lineHeight:1.6}}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini chart preview */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"20px 24px"}}>
              <div style={{fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:4}}>Portfolio vs S&P 500 — Normalized (Base 100)</div>
              <div style={{fontSize:11,color:COLORS.dim,marginBottom:16}}>Jun 2025 → Now · Your portfolio vs benchmark</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sp500Normalized}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111e35" />
                  <XAxis dataKey="month" tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} domain={["auto","auto"]} />
                  <Tooltip contentStyle={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,fontSize:12}} labelStyle={{color:COLORS.muted}} />
                  <ReferenceLine y={100} stroke="#1e3a5f" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="portfolio" stroke={COLORS.accent} strokeWidth={2.5} dot={false} name="Your Portfolio" />
                  <Line type="monotone" dataKey="sp500" stroke={COLORS.muted} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="S&P 500" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:20,marginTop:10,justifyContent:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:COLORS.muted}}>
                  <div style={{width:16,height:2,background:COLORS.accent}} /> Your Portfolio
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:COLORS.muted}}>
                  <div style={{width:16,height:2,background:COLORS.muted,borderTop:"2px dashed"}} /> S&P 500
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            DASHBOARD
        ══════════════════════════════════════════════════════════════ */}
        {tab==="dashboard" && (
          <div className="fade-in">
            <SectionTitle sub="Real-time portfolio overview with live position data">Portfolio Overview</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:13,marginBottom:24}}>
              <StatCard label="Total Deployed" value={fmt(totalDeployed)} sub="4 trades" />
              <StatCard label="Current Value" value={loading?"···":fmt(totalCurrent)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Total Gain" value={loading?"···":(totalGL>=0?"+":"")+fmt(totalGL)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Return %" value={loading?"···":pct(totalPct)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Best Pick" value={loading?"···":bestH?.ticker} sub={loading?"":pct(bestH?.pctChange??0)} color={COLORS.green} />
              <StatCard label="Worst Pick" value={loading?"···":worstH?.ticker} sub={loading?"":pct(worstH?.pctChange??0)} color={COLORS.red} />
            </div>

            {/* Portfolio value chart */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:2}}>Portfolio Value — Jun 2025 to Now</div>
              <div style={{fontSize:11,color:COLORS.dim,marginBottom:14}}>Dashed line = $100K original cost basis · Green dot = current value</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111e35" />
                  <XAxis dataKey="month" tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} domain={["auto","auto"]} />
                  <Tooltip contentStyle={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,fontSize:12}} formatter={v=>[fmt(v),"Portfolio"]} labelStyle={{color:COLORS.muted}} />
                  <ReferenceLine y={100000} stroke="#1e3a5f" strokeDasharray="4 3" />
                  <Area type="monotone" dataKey="value" stroke={COLORS.accent} strokeWidth={2.5} fill="url(#portfolioGrad)"
                    dot={(props)=>{
                      const isNow=props.index===chartData.length-1;
                      return <circle key={props.index} cx={props.cx} cy={props.cy} r={isNow?6:3} fill={isNow?COLORS.green:COLORS.accent} stroke={isNow?COLORS.card:"none"} strokeWidth={2}/>;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Positions table */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:16}}>All Positions</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {holdings.map(h=>(
                  <div key={h.ticker} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"8px 0",borderBottom:`1px solid ${COLORS.bg}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,minWidth:180}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:h.color,flexShrink:0}} />
                      <span style={{fontWeight:700,fontSize:13,color:COLORS.text}}>{h.ticker}</span>
                      <Badge text={h.type} color={h.type==="ETF"?COLORS.accent:COLORS.muted} bg={h.type==="ETF"?"#1a1b4a":"#1a2540"} />
                      <span style={{fontSize:9,color:COLORS.dim}}>{h.buyDate}</span>
                    </div>
                    <div style={{fontSize:12,color:COLORS.muted,minWidth:72}}>{loading?"···":fmt(h.currentPrice)}</div>
                    <div style={{flex:1,minWidth:60}}>
                      <div style={{height:4,background:"#111e35",borderRadius:3}}>
                        <div style={{height:"100%",width:`${Math.min(100,Math.abs(h.pctChange)*1.5)}%`,background:h.pctChange>=0?h.color:COLORS.red,borderRadius:3}} />
                      </div>
                    </div>
                    <div style={{textAlign:"right",minWidth:100}}>
                      <div style={{fontSize:13,fontWeight:600,color:COLORS.text}}>{loading?"···":fmt(h.currentValue)}</div>
                    </div>
                    <div style={{minWidth:80,textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:h.pctChange>=0?COLORS.green:COLORS.red}}>{loading?"···":pct(h.pctChange)}</div>
                      <div style={{fontSize:10,color:COLORS.dim}}>{loading?"":""+fmt(h.gainLoss)}</div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10}}>
                  <span style={{fontWeight:700,color:COLORS.muted,fontSize:12}}>TOTAL · $130K deployed</span>
                  <span style={{fontWeight:800,fontSize:15,color:totalGL>=0?COLORS.green:COLORS.red}}>
                    {loading?"···":`${fmt(totalCurrent)} · ${pct(totalPct)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ANALYTICS
        ══════════════════════════════════════════════════════════════ */}
        {tab==="analytics" && (
          <div className="fade-in">
            <SectionTitle sub="Institutional-grade metrics calculated from your real portfolio data">Advanced Analytics</SectionTitle>

            {/* Key metrics */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:13,marginBottom:28}}>
              {[
                {label:"CAGR",value:`${round2(cagr)}%`,sub:"Annualized return",color:COLORS.green,tip:"Compound Annual Growth Rate — your smoothed yearly return"},
                {label:"Sharpe Ratio",value:sharpe===null?"—":round2(sharpe),sub:sharpe===null?"Needs more history":sharpe>1?"Good risk-adjusted":"Below 1.0",color:sharpe===null?COLORS.dim:sharpe>1?COLORS.green:COLORS.yellow,tip:"Return per unit of risk. Above 1.0 is good."},
                {label:"Portfolio Beta",value:round2(portfolioBeta),sub:"vs S&P 500",color:COLORS.accentLight,tip:"How much your portfolio moves vs the market"},
                {label:"Alpha",value:alpha===null?"—":`${round2(alpha)}%`,sub:alpha===null?"Needs more history":"vs benchmark",color:alpha===null?COLORS.dim:alpha>0?COLORS.green:COLORS.red,tip:"Return above what market exposure predicts"},
                {label:"Max Drawdown",value:maxDD===null?"—":`${round2(maxDD)}%`,sub:maxDD===null?"Needs more history":"Mar 2026 crash",color:maxDD===null?COLORS.dim:COLORS.red,tip:"Largest peak-to-trough decline"},
                {label:"S&P 500 Return",value:sp500Return===null?"—":`${round2(sp500Return)}%`,sub:"Same period",color:COLORS.muted,tip:"S&P 500 return since portfolio start"},
              ].map((m,i)=>(
                <div key={i} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:9,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:5}}>{m.label}</div>
                  <div style={{fontSize:22,fontWeight:800,color:m.color,lineHeight:1}}>{m.value}</div>
                  <div style={{fontSize:11,color:COLORS.muted,marginTop:4}}>{m.sub}</div>
                  <div style={{fontSize:10,color:COLORS.dim,marginTop:4,lineHeight:1.4,fontStyle:"italic"}}>{m.tip}</div>
                </div>
              ))}
            </div>

            {/* Portfolio vs S&P comparison */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:2}}>Portfolio vs S&P 500 — Normalized (Base = 100)</div>
              <div style={{fontSize:11,color:COLORS.dim,marginBottom:4}}>
                Your portfolio: <span style={{color:COLORS.green,fontWeight:700}}>+{round2(totalPct)}%</span> &nbsp;|&nbsp;
                S&P 500: <span style={{color:COLORS.muted,fontWeight:700}}>+{round2(sp500Return)}%</span> &nbsp;|&nbsp;
                Alpha: <span style={{color:alpha>0?COLORS.green:COLORS.red,fontWeight:700}}>{round2(alpha)}%</span>
              </div>
              <div style={{fontSize:11,color:COLORS.dim,marginBottom:14}}>Outperforming S&P 500 by {round2(totalPct-sp500Return)}% on an absolute basis</div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={sp500Normalized}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111e35" />
                  <XAxis dataKey="month" tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} domain={["auto","auto"]} />
                  <Tooltip contentStyle={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,fontSize:12}} labelStyle={{color:COLORS.muted}} />
                  <ReferenceLine y={100} stroke="#1e3a5f" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="portfolio" stroke={COLORS.accent} strokeWidth={2.5} dot={false} name="Your Portfolio" />
                  <Line type="monotone" dataKey="sp500" stroke={COLORS.muted} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="S&P 500" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:20,marginTop:8,justifyContent:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:COLORS.muted}}><div style={{width:16,height:2,background:COLORS.accent}}/> Your Portfolio (+{round2(totalPct)}%)</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:COLORS.muted}}><div style={{width:16,height:2,background:COLORS.muted}}/> S&amp;P 500 (+{round2(sp500Return)}%)</div>
              </div>
            </div>

            {/* Sector allocation */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
              <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Sector Allocation</div>
                {sectorData.map((s,i)=>(
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:COLORS.text}}>{s.name}</span>
                      <span style={{fontSize:12,fontWeight:600,color:COLORS.accentLight}}>{s.pct}%</span>
                    </div>
                    <div style={{height:5,background:"#111e35",borderRadius:3}}>
                      <div style={{height:"100%",width:`${s.pct}%`,background:COLORS.accent,borderRadius:3,opacity:0.8+i*0.05}}/>
                    </div>
                    <div style={{fontSize:10,color:COLORS.dim,marginTop:2}}>{fmt(s.value)}</div>
                  </div>
                ))}
              </div>

              {/* Return by position */}
              <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Return by Position</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...holdings].sort((a,b)=>b.pctChange-a.pctChange)} layout="vertical">
                    <XAxis type="number" tick={{fill:COLORS.dim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`} />
                    <YAxis type="category" dataKey="ticker" tick={{fill:COLORS.text,fontSize:11,fontWeight:600}} axisLine={false} tickLine={false} width={45} />
                    <Tooltip contentStyle={{background:COLORS.bg,border:`1px solid ${COLORS.border}`,borderRadius:8,fontSize:12}} formatter={v=>[`${v.toFixed(2)}%`,"Return"]} />
                    <Bar dataKey="pctChange" radius={[0,4,4,0]}>
                      {holdings.map((h,i)=><Cell key={i} fill={h.pctChange>=0?COLORS.green:COLORS.red}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly returns heatmap */}
            {P.hasHistory ? (
              <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:4}}>Monthly Portfolio Change</div>
                <div style={{fontSize:11,color:COLORS.dim,marginBottom:14}}>Green = portfolio gained · Red = portfolio lost that month</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {monthlyVals.slice(1).map((m,i)=>{
                    const change=m.value-monthlyVals[i].value;
                    const pctChg=(change/monthlyVals[i].value)*100;
                    const intensity=Math.min(1,Math.abs(pctChg)/10);
                    const bg=change>=0?`rgba(52,211,153,${0.15+intensity*0.45})`:`rgba(248,113,113,${0.15+intensity*0.45})`;
                    return (
                      <div key={i} style={{background:bg,border:`1px solid ${change>=0?"#1a3528":"#3a1e1e"}`,borderRadius:8,padding:"8px 10px",minWidth:70,textAlign:"center"}}>
                        <div style={{fontSize:9,color:COLORS.muted,marginBottom:2}}>{m.month}</div>
                        <div style={{fontSize:13,fontWeight:700,color:change>=0?COLORS.green:COLORS.red}}>{pct(pctChg,1)}</div>
                        <div style={{fontSize:9,color:COLORS.dim}}>{change>=0?"+":""}{fmt(change).replace("$","$")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",color:COLORS.muted,fontSize:12}}>
                Monthly change data builds up over time — {P.label} just started on {P.trades[0].buyDate}.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            HEALTH SCORE
        ══════════════════════════════════════════════════════════════ */}
        {tab==="health" && (
          <div className="fade-in">
            <SectionTitle sub="A comprehensive evaluation of your portfolio's structure and risk profile">Portfolio Health Score</SectionTitle>

            {/* Big score */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:16,padding:"32px 28px",marginBottom:24,textAlign:"center"}}>
              <div style={{fontSize:11,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Overall Health Score</div>
              <div style={{position:"relative",display:"inline-block",marginBottom:16}}>
                <div style={{width:140,height:140,borderRadius:"50%",background:`conic-gradient(${healthScore>=70?COLORS.green:healthScore>=50?COLORS.yellow:COLORS.red} ${healthScore*3.6}deg, #111e35 0deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:110,height:110,borderRadius:"50%",background:COLORS.card,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:36,fontWeight:900,color:healthScore>=70?COLORS.green:healthScore>=50?COLORS.yellow:COLORS.red,lineHeight:1}}>{healthScore}</div>
                    <div style={{fontSize:11,color:COLORS.muted}}>out of 100</div>
                  </div>
                </div>
              </div>
              <div style={{fontSize:18,fontWeight:700,color:COLORS.text,marginBottom:8}}>
                {healthScore>=70?"Good Portfolio Health":healthScore>=50?"Moderate Health":"Needs Attention"}
              </div>
              <div style={{fontSize:13,color:COLORS.muted,maxWidth:500,margin:"0 auto",lineHeight:1.6}}>
                Your portfolio scores well on diversification and asset mix but carries concentration risk in the Technology sector ({sectorData.find(s=>s.name==="Technology")?.pct||0}% of holdings). Adding exposure to other sectors would improve this score.
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:24}}>
              {healthDetails.map((d,i)=>(
                <div key={i} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:COLORS.text}}>{d.label}</span>
                    <span style={{fontSize:16,fontWeight:800,color:d.score/d.max>=0.7?COLORS.green:d.score/d.max>=0.5?COLORS.yellow:COLORS.red}}>{d.score}/{d.max}</span>
                  </div>
                  <div style={{height:6,background:"#111e35",borderRadius:3,marginBottom:8}}>
                    <div style={{height:"100%",width:`${(d.score/d.max)*100}%`,background:d.score/d.max>=0.7?COLORS.green:d.score/d.max>=0.5?COLORS.yellow:COLORS.red,borderRadius:3,transition:"width 0.5s ease"}} />
                  </div>
                  <div style={{fontSize:11,color:COLORS.muted,lineHeight:1.5}}>{d.note}</div>
                </div>
              ))}
            </div>

            {/* Risk radar */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:16}}>Risk Profile Radar</div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={[
                  {metric:"Diversification", score:healthDetails[0].score/healthDetails[0].max*100},
                  {metric:"Sector Balance", score:healthDetails[1].score/healthDetails[1].max*100},
                  {metric:"Asset Mix", score:healthDetails[2].score/healthDetails[2].max*100},
                  {metric:"Beta Control", score:healthDetails[3].score/healthDetails[3].max*100},
                  {metric:"Return Quality", score:Math.min(100,sharpe*50)},
                ]}>
                  <PolarGrid stroke="#1a2540" />
                  <PolarAngleAxis dataKey="metric" tick={{fill:COLORS.muted,fontSize:11}} />
                  <Radar dataKey="score" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Recommendations */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Recommendations to Improve Your Score</div>
              {[
                {icon:"⚠️",priority:"High",text:"Reduce Technology sector concentration below 50%. Currently at "+sectorData.find(s=>s.name==="Technology")?.pct+"%. Consider adding Healthcare, Utilities, or Consumer Staples exposure.",color:COLORS.red},
                {icon:"💡",priority:"Medium",text:"Add an international ETF (VEA, VXUS) to reduce US-market dependency. Currently 100% domestic exposure.",color:COLORS.yellow},
                {icon:"✅",priority:"Good",text:"Your ETF allocation (VOO, QQQ) provides good core exposure. ETFs now represent "+Math.round(holdings.filter(h=>h.type==="ETF").reduce((s,h)=>s+h.currentValue,0)/totalCurrent*100)+"% of portfolio.",color:COLORS.green},
                {icon:"✅",priority:"Good",text:"Portfolio beta of "+round2(portfolioBeta)+" is well-controlled — not excessively volatile relative to the market.",color:COLORS.green},
              ].map((r,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<3?`1px solid ${COLORS.bg}`:"none"}}>
                  <div style={{fontSize:18,flexShrink:0}}>{r.icon}</div>
                  <div>
                    <Badge text={r.priority} color={r.color} bg={r.color+"22"} />
                    <div style={{fontSize:12,color:COLORS.muted,marginTop:6,lineHeight:1.6}}>{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            AI ASSISTANT
        ══════════════════════════════════════════════════════════════ */}
        {tab==="ai" && (
          <div className="fade-in">
            <SectionTitle sub="Ask anything about your portfolio — powered by Claude AI with full access to your data">AI Portfolio Assistant</SectionTitle>

            {/* Suggested questions */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
              {[
                "Why did my portfolio drop in March 2026?",
                "How diversified am I?",
                "What is my Sharpe Ratio and what does it mean?",
                "Which position has the best risk-adjusted return?",
                "How does my portfolio compare to the S&P 500?",
                "What are the biggest risks in my portfolio?",
              ].map((q,i)=>(
                <button key={i} onClick={()=>setAiInput(q)} style={{fontSize:11,padding:"6px 12px",borderRadius:20,border:`1px solid ${COLORS.border}`,background:COLORS.card,color:COLORS.muted,cursor:"pointer"}}>
                  {q}
                </button>
              ))}
            </div>

            {/* Chat window */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,overflow:"hidden",marginBottom:0}}>
              <div ref={chatRef} style={{height:380,overflowY:"auto",padding:"20px"}}>
                {aiMessages.map((m,i)=>(
                  <div key={i} style={{marginBottom:16,display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
                    <div style={{fontSize:9,color:COLORS.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.07em"}}>
                      {m.role==="user"?"You":"AI Assistant"}
                    </div>
                    <div style={{
                      maxWidth:"80%",padding:"12px 16px",borderRadius:12,fontSize:13,lineHeight:1.6,
                      background:m.role==="user"?COLORS.accent:"#111e35",
                      color:m.role==="user"?"#fff":COLORS.text,
                      borderBottomRightRadius:m.role==="user"?0:12,
                      borderBottomLeftRadius:m.role==="assistant"?0:12,
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{display:"flex",gap:4,alignItems:"center",padding:"8px 0"}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:6,height:6,borderRadius:"50%",background:COLORS.accent,animation:`pulse 1.2s ${i*0.2}s infinite`}} />
                    ))}
                    <span style={{fontSize:11,color:COLORS.muted,marginLeft:6}}>Thinking…</span>
                  </div>
                )}
              </div>
              <div style={{borderTop:`1px solid ${COLORS.border}`,padding:"14px 16px",display:"flex",gap:10}}>
                <input
                  value={aiInput}
                  onChange={e=>setAiInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendAiMessage()}
                  placeholder="Ask anything about your portfolio…"
                  style={{flex:1,background:"#111e35",border:`1px solid ${COLORS.border}`,borderRadius:8,padding:"10px 14px",color:COLORS.text,fontSize:13,outline:"none"}}
                />
                <button onClick={sendAiMessage} disabled={aiLoading||!aiInput.trim()} style={{padding:"10px 20px",borderRadius:8,background:COLORS.accent,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:aiLoading||!aiInput.trim()?0.5:1}}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MONTHLY ANALYSIS
        ══════════════════════════════════════════════════════════════ */}
        {tab==="monthly" && !P.hasHistory && (
          <div className="fade-in">
            <SectionTitle sub="Month-by-month history builds up over time">Monthly Analysis</SectionTitle>
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"24px",color:COLORS.muted,fontSize:13}}>
              {P.label} started on {P.trades[0].buyDate} — once a few months of price snapshots build up, this tab will show the same month-by-month breakdown as Portfolio 1.
            </div>
          </div>
        )}
        {tab==="monthly" && P.hasHistory && (
          <div className="fade-in">
            <SectionTitle sub="In-depth breakdown of every month — market events, performers, and portfolio impact">Monthly Analysis</SectionTitle>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:22}}>
              {MONTHLY_ANALYSIS.map((m,i)=>(
                <button key={i} onClick={()=>setAnalysisIdx(i)} style={{padding:"7px 12px",borderRadius:7,border:analysisIdx===i?`1px solid ${COLORS.accent}`:`1px solid ${COLORS.border}`,background:analysisIdx===i?"#191b4a":COLORS.card,color:analysisIdx===i?COLORS.accentLight:COLORS.muted,cursor:"pointer",fontSize:12,fontWeight:analysisIdx===i?700:400}}>
                  {m.month}
                </button>
              ))}
            </div>
            {(() => {
              const a = MONTHLY_ANALYSIS[analysisIdx];
              const mData = MONTHLY_HISTORY[analysisIdx];
              return (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"20px 24px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
                      <div>
                        <div style={{fontSize:10,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Monthly Analysis</div>
                        <div style={{fontSize:22,fontWeight:800,color:COLORS.text}}>{a.month}</div>
                        {a.spReturn && <div style={{fontSize:13,color:a.spReturn.startsWith("+")?COLORS.green:COLORS.red,marginTop:4,fontWeight:600}}>S&P 500: {a.spReturn} that month</div>}
                      </div>
                      {a.change && (
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>Portfolio Change</div>
                          <div style={{fontSize:26,fontWeight:900,color:a.change.startsWith("+")?COLORS.green:COLORS.red}}>{a.change}</div>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.7}}>{a.summary}</div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div style={{background:COLORS.card,border:`1px solid #1a3528`,borderLeft:`3px solid ${COLORS.green}`,borderRadius:12,padding:"16px 20px"}}>
                      <div style={{fontSize:10,color:COLORS.green,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Best Performer</div>
                      <div style={{fontSize:20,fontWeight:800,color:COLORS.text,marginBottom:4}}>{a.best.ticker}</div>
                      <div style={{fontSize:12,color:COLORS.muted,lineHeight:1.5}}>{a.best.reason}</div>
                    </div>
                    <div style={{background:COLORS.card,border:`1px solid #3a1e1e`,borderLeft:`3px solid ${COLORS.red}`,borderRadius:12,padding:"16px 20px"}}>
                      <div style={{fontSize:10,color:COLORS.red,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Worst Performer</div>
                      <div style={{fontSize:20,fontWeight:800,color:COLORS.text,marginBottom:4}}>{a.worst.ticker}</div>
                      <div style={{fontSize:12,color:COLORS.muted,lineHeight:1.5}}>{a.worst.reason}</div>
                    </div>
                  </div>

                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Key Events</div>
                    {a.events.map((ev,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:COLORS.accent,flexShrink:0,marginTop:5}} />
                        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{ev}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Position Snapshot — End of {a.month}</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:450}}>
                        <thead>
                          <tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
                            {["Ticker","Price","Value","Return Since Buy"].map(h=>(
                              <th key={h} style={{padding:"7px 4px",textAlign:"left",color:COLORS.dim,fontWeight:500,fontSize:10,textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TRADES.map(p=>{
                            const price=mData[p.ticker];
                            if(price===null) return (
                              <tr key={p.ticker} style={{borderBottom:`1px solid ${COLORS.bg}`,opacity:0.3}}>
                                <td style={{padding:"8px 4px",fontWeight:700,color:COLORS.muted}}>{p.ticker}</td>
                                <td colSpan={3} style={{padding:"8px 4px",color:COLORS.dim,fontStyle:"italic",fontSize:11}}>Not yet purchased</td>
                              </tr>
                            );
                            const shares=p.allocation/p.buyPrice, val=shares*price;
                            const ret=((price-p.buyPrice)/p.buyPrice)*100;
                            return (
                              <tr key={p.ticker} style={{borderBottom:`1px solid ${COLORS.bg}`}}>
                                <td style={{padding:"8px 4px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <div style={{width:6,height:6,borderRadius:"50%",background:p.color}} />
                                    <span style={{fontWeight:700,color:COLORS.text}}>{p.ticker}</span>
                                  </div>
                                </td>
                                <td style={{padding:"8px 4px",color:"#94a3b8"}}>{fmt(price)}</td>
                                <td style={{padding:"8px 4px",fontWeight:600,color:COLORS.text}}>{fmt(val)}</td>
                                <td style={{padding:"8px 4px",fontWeight:700,color:ret>=0?COLORS.green:COLORS.red}}>{pct(ret)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            EDUCATION CENTER
        ══════════════════════════════════════════════════════════════ */}
        {tab==="education" && (
          <div className="fade-in">
            <SectionTitle sub="Learn the concepts behind your portfolio metrics with interactive examples and quizzes">Education Center</SectionTitle>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
              {EDUCATION_CONTENT.map((e,i)=>(
                <button key={i} onClick={()=>setEduIdx(i)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:eduIdx===i?`1px solid ${COLORS.accent}`:`1px solid ${COLORS.border}`,background:eduIdx===i?"#191b4a":COLORS.card,color:eduIdx===i?COLORS.accentLight:COLORS.muted,cursor:"pointer",fontSize:12,fontWeight:eduIdx===i?700:400}}>
                  <span>{e.icon}</span>{e.title}
                </button>
              ))}
            </div>
            {(() => {
              const e = EDUCATION_CONTENT[eduIdx];
              const answered = quizAnswers[e.id];
              return (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"22px 26px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                      <div style={{fontSize:28}}>{e.icon}</div>
                      <div>
                        <Badge text={e.category} color={COLORS.accent} bg="#1a1b4a" />
                        <div style={{fontSize:20,fontWeight:800,color:COLORS.text,marginTop:4}}>{e.title}</div>
                      </div>
                    </div>
                    <div style={{fontSize:15,color:COLORS.accentLight,fontWeight:600,marginBottom:12}}>{e.summary}</div>
                    <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.7,marginBottom:14}}>{e.detail}</div>
                    <div style={{background:"#111e35",borderRadius:8,padding:"12px 16px",fontSize:12,color:COLORS.muted,borderLeft:`3px solid ${COLORS.accent}`}}>
                      <span style={{fontWeight:600,color:COLORS.accentLight}}>Example: </span>{e.example}
                    </div>
                  </div>

                  {/* Your portfolio's value for this metric */}
                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"16px 20px"}}>
                    <div style={{fontSize:11,color:COLORS.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>Your Portfolio's {e.title}</div>
                    <div style={{fontSize:22,fontWeight:800,color:COLORS.green,marginBottom:6}}>
                      {e.id==="cagr"&&`${round2(cagr)}% per year`}
                      {e.id==="sharpe"&&`${round2(sharpe)} — ${sharpe>1?"Above average":"Room to improve"}`}
                      {e.id==="beta"&&`${round2(portfolioBeta)} — ${portfolioBeta<1.2?"Moderate":"Slightly aggressive"}`}
                      {e.id==="alpha"&&`${round2(alpha)}% — ${alpha>0?"Outperforming benchmark":"Below benchmark"}`}
                      {e.id==="drawdown"&&`${round2(maxDD)}% — occurred March 2026`}
                      {e.id==="diversification"&&`${Object.keys(sectors).length} sectors, ${holdings.length} positions`}
                    </div>
                    <div style={{fontSize:12,color:COLORS.muted}}>
                      {e.id==="cagr"&&"Your portfolio has compounded at "+round2(cagr)+"% annually — better than the average savings account rate of ~4.5%."}
                      {e.id==="sharpe"&&(sharpe>1?"A Sharpe above 1.0 means you're being well-compensated for the risk you're taking.":"Consider reducing high-beta holdings like NVDA to improve your risk-adjusted return.")}
                      {e.id==="beta"&&"A beta of "+round2(portfolioBeta)+" means if the S&P 500 drops 10%, your portfolio would typically drop ~"+round2(portfolioBeta*10)+"%."}
                      {e.id==="alpha"&&(alpha>0?"You've generated "+round2(alpha)+"% in excess returns above what your market exposure would predict — this is genuine outperformance.":"Your portfolio has underperformed on a risk-adjusted basis relative to a simple index fund.")}
                      {e.id==="drawdown"&&"Your worst drawdown of "+round2(maxDD)+"% happened during the March 2026 Liberation Day tariff shock. Staying invested through it was the right call."}
                      {e.id==="diversification"&&"You have exposure across "+Object.keys(sectors).length+" sectors but "+sectorData[0].pct+"% is concentrated in "+sectorData[0].name+". Consider adding healthcare or utilities for better balance."}
                    </div>
                  </div>

                  {/* Quiz */}
                  <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Quick Quiz</div>
                    <div style={{fontSize:14,color:COLORS.text,marginBottom:14,lineHeight:1.6}}>{e.quiz.q}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {e.quiz.options.map((opt,i)=>{
                        const isCorrect=i===e.quiz.answer;
                        const isSelected=answered===i;
                        const showResult=answered!==undefined;
                        return (
                          <button key={i} onClick={()=>!showResult&&setQuizAnswers(prev=>({...prev,[e.id]:i}))} style={{
                            padding:"10px 16px",borderRadius:8,textAlign:"left",fontSize:13,cursor:showResult?"default":"pointer",
                            border:`1px solid ${showResult?(isCorrect?"#1a3528":isSelected?"#3a1e1e":COLORS.border):COLORS.border}`,
                            background:showResult?(isCorrect?"#0a2a1a":isSelected&&!isCorrect?"#2a0a0a":COLORS.card):COLORS.card,
                            color:showResult?(isCorrect?COLORS.green:isSelected?COLORS.red:COLORS.muted):COLORS.text,
                            fontWeight:showResult&&isCorrect?700:400,
                          }}>
                            {showResult&&isCorrect?"✓ ":showResult&&isSelected&&!isCorrect?"✗ ":""}{opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered!==undefined && (
                      <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:answered===e.quiz.answer?"#0a2a1a":"#2a0a0a",fontSize:12,color:answered===e.quiz.answer?COLORS.green:COLORS.red}}>
                        {answered===e.quiz.answer?"Correct! "+e.quiz.options[e.quiz.answer]+" is right.":"Not quite — the correct answer is: "+e.quiz.options[e.quiz.answer]}
                        <button onClick={()=>setQuizAnswers(prev=>{const n={...prev};delete n[e.id];return n;})} style={{marginLeft:12,fontSize:11,color:COLORS.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Try again</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ROADMAP
        ══════════════════════════════════════════════════════════════ */}
        {tab==="roadmap" && (
          <div className="fade-in">
            <SectionTitle sub="What's been built, what's coming next, and the full development history">Roadmap & Changelog</SectionTitle>

            {/* Roadmap */}
            <div style={{marginBottom:32}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:16}}>Development Roadmap</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
                {ROADMAP.map((q,i)=>(
                  <div key={i} style={{background:COLORS.card,border:`1px solid ${q.status==="current"?COLORS.accent:COLORS.border}`,borderTop:`3px solid ${q.status==="current"?COLORS.accent:q.status==="planned"?COLORS.yellow:"#1a2540"}`,borderRadius:12,padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:700,color:COLORS.text}}>{q.quarter}</div>
                      <Badge text={q.status==="current"?"In Progress":q.status==="planned"?"Planned":"Future"} color={q.status==="current"?COLORS.green:q.status==="planned"?COLORS.yellow:COLORS.muted} bg={q.status==="current"?"#0a2a1a":q.status==="planned"?"#2a1a0a":"#1a2540"} />
                    </div>
                    {q.items.map((item,j)=>(
                      <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:q.status==="current"?COLORS.accent:COLORS.dim,flexShrink:0,marginTop:4}} />
                        <div style={{fontSize:12,color:q.status==="current"?COLORS.text:COLORS.muted,lineHeight:1.4}}>{item}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Changelog */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:16}}>Changelog</div>
              {CHANGELOG.map((c,i)=>(
                <div key={i} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"16px 20px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <Badge text={`v${c.version}`} color={COLORS.accentLight} bg="#191b4a" />
                    <Badge text={c.type==="major"?"Major Release":"Minor Update"} color={c.type==="major"?COLORS.green:COLORS.yellow} bg={c.type==="major"?"#0a2a1a":"#2a1a0a"} />
                    <span style={{fontSize:11,color:COLORS.dim}}>{c.date}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {c.notes.map((n,j)=>(
                      <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                        <span style={{fontSize:11,color:COLORS.accent,marginTop:1}}>+</span>
                        <span style={{fontSize:12,color:"#94a3b8",lineHeight:1.4}}>{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Impact metrics */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginTop:8}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Platform Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
                {[
                  {label:"Portfolios Tracked",value:"1",sub:"Jon Ong"},
                  {label:"Positions Monitored",value:"9",sub:"across 4 trades"},
                  {label:"Months of Data",value:"13",sub:"Jun '25 → Now"},
                  {label:"Metrics Calculated",value:"10+",sub:"per portfolio"},
                  {label:"Features Shipped",value:"v2.0",sub:"this session"},
                  {label:"AI Queries Answered",value:"∞",sub:"ask anything"},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:800,color:COLORS.accentLight}}>{s.value}</div>
                    <div style={{fontSize:10,color:COLORS.text,fontWeight:600,marginTop:2}}>{s.label}</div>
                    <div style={{fontSize:10,color:COLORS.dim}}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            LEADERBOARD
        ══════════════════════════════════════════════════════════════ */}
        {tab==="leaderboard" && (
          <div className="fade-in">
            <SectionTitle sub="Every community member started with $100,000 — ranked by return since day one">Community Leaderboard</SectionTitle>
            <LeaderboardTab />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MY PORTFOLIO (accounts)
        ══════════════════════════════════════════════════════════════ */}
        {tab==="myportfolio" && (
          <div className="fade-in">
            <SectionTitle sub="Build your own — everyone starts with $100,000 and free rein to invest">My Portfolio</SectionTitle>
            <MyPortfolioTab user={user} myPortfolio={myPortfolio} onAuthed={loadMyPortfolio} onLogout={handleLogout} onTraded={()=>loadMyPortfolio(user)} />
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{borderTop:`1px solid ${COLORS.border}`,padding:"20px 28px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:11,color:COLORS.dim}}>PortfolioTrack v{VERSION} &nbsp;by Jon Ong</div>
          <div style={{fontSize:11,color:COLORS.dim}}>For educational purposes only. Not financial advice.</div>
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────────
function LeaderboardTab() {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function build() {
      setLoadingRows(true);
      const { data: portfolios } = await supabase.from("portfolios").select("*");
      const { data: trades } = await supabase.from("trades").select("*");
      if (!portfolios) { setLoadingRows(false); return; }

      const quoteCache = {};
      const uniqueTickers = [...new Set((trades || []).map(t => t.ticker))];
      await Promise.all(uniqueTickers.map(async (ticker) => {
        const { price } = await fetchFinnhub(ticker, 0);
        quoteCache[ticker] = price;
      }));

      const ranked = portfolios.map(p => {
        const held = (trades || []).filter(t => t.portfolio_id === p.id);
        const holdingsValue = held.reduce((s, t) => s + t.shares * (quoteCache[t.ticker] || 0), 0);
        const totalValue = holdingsValue + p.cash_balance;
        const returnPct = ((totalValue - p.starting_cash) / p.starting_cash) * 100;
        return { ...p, totalValue, returnPct };
      }).sort((a, b) => b.returnPct - a.returnPct);

      if (!cancelled) { setRows(ranked); setLoadingRows(false); }
    }
    build();
    return () => { cancelled = true; };
  }, []);

  if (loadingRows) return <div style={{ color: COLORS.muted, fontSize: 13 }}>Loading leaderboard…</div>;
  if (rows.length === 0) return <div style={{ color: COLORS.muted, fontSize: 13 }}>No community portfolios yet — be the first under "My Portfolio."</div>;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            {["Rank", "Portfolio", "Value", "Return"].map(h => (
              <th key={h} style={{ padding: "7px 4px", textAlign: "left", color: COLORS.dim, fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderBottom: `1px solid ${COLORS.bg}` }}>
              <td style={{ padding: "8px 4px", color: COLORS.muted }}>{i + 1}</td>
              <td style={{ padding: "8px 4px", fontWeight: 700, color: COLORS.text }}>{r.display_name}</td>
              <td style={{ padding: "8px 4px", color: "#94a3b8" }}>{fmt(r.totalValue)}</td>
              <td style={{ padding: "8px 4px", fontWeight: 700, color: r.returnPct >= 0 ? COLORS.green : COLORS.red }}>{pct(r.returnPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MY PORTFOLIO (ACCOUNTS) ────────────────────────────────────────────────
const inputStyle = { display: "block", width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, marginTop: 4 };
const btnStyle = { padding: "9px 16px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 };

function MyPortfolioTab({ user, myPortfolio, onAuthed, onLogout, onTraded }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [tradeError, setTradeError] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [priceStatus, setPriceStatus] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

  useEffect(() => { if (myPortfolio) loadHoldings(); }, [myPortfolio]);

  // Aggregate raw trade rows into one position per ticker (total shares + cost basis)
  const positions = Object.values(
    holdings.reduce((acc, t) => {
      if (!acc[t.ticker]) acc[t.ticker] = { ticker: t.ticker, shares: 0, costBasis: 0 };
      acc[t.ticker].shares += t.shares;
      acc[t.ticker].costBasis += t.amount;
      return acc;
    }, {})
  );

  const refreshLivePrices = useCallback(async (tickers) => {
    if (!tickers.length) return;
    setPricesLoading(true);
    const newPrices = {}, newStatus = {};
    await Promise.all(tickers.map(async (tk) => {
      const { price, source } = await fetchFinnhub(tk, null);
      newPrices[tk] = price; newStatus[tk] = source;
    }));
    setLivePrices(prev => ({ ...prev, ...newPrices }));
    setPriceStatus(prev => ({ ...prev, ...newStatus }));
    setLastLiveUpdate(new Date());
    setPricesLoading(false);
  }, []);

  // Auto-refresh live prices for held tickers every 5 minutes (same cadence as the demo portfolios)
  useEffect(() => {
    const tickers = positions.map(p => p.ticker);
    if (!tickers.length) return;
    refreshLivePrices(tickers);
    const i = setInterval(() => refreshLivePrices(tickers), 5 * 60 * 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length, refreshLivePrices]);

  async function loadHoldings() {
    const { data } = await supabase.from("trades").select("*").eq("portfolio_id", myPortfolio.id);
    setHoldings(data || []);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError(""); setAuthLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setAuthLoading(false); return; }
      if (data.user) {
        const { error: pErr } = await supabase.from("portfolios").insert({
          user_id: data.user.id, display_name: displayName || email.split("@")[0], starting_cash: 100000, cash_balance: 100000,
        });
        if (pErr) { setError("Account created, but portfolio setup failed: " + pErr.message); setAuthLoading(false); return; }
      }
      onAuthed(data.user);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setAuthLoading(false); return; }
      onAuthed(data.user);
    }
    setAuthLoading(false);
  }

  async function lookupPrice() {
    setTradeError(""); setQuote(null);
    if (!ticker) return;
    const { price } = await fetchFinnhub(ticker.toUpperCase(), 0);
    if (!price) { setTradeError("No price found for that ticker."); return; }
    setQuote(price);
  }

  async function handleBuy(e) {
    e.preventDefault();
    setTradeError("");
    const dollarAmount = parseFloat(amount);
    if (!quote) { setTradeError("Look up the price first."); return; }
    if (!dollarAmount || dollarAmount <= 0) { setTradeError("Enter a dollar amount."); return; }
    if (dollarAmount > myPortfolio.cash_balance) { setTradeError(`You only have ${fmt(myPortfolio.cash_balance)} available.`); return; }

    setTradeLoading(true);
    const shares = dollarAmount / quote;
    const { error: tErr } = await supabase.from("trades").insert({ portfolio_id: myPortfolio.id, ticker: ticker.toUpperCase(), shares, price: quote, amount: dollarAmount });
    if (tErr) { setTradeError(tErr.message); setTradeLoading(false); return; }
    const { error: bErr } = await supabase.from("portfolios").update({ cash_balance: myPortfolio.cash_balance - dollarAmount }).eq("id", myPortfolio.id);
    setTradeLoading(false);
    if (bErr) { setTradeError(bErr.message); return; }
    setTicker(""); setAmount(""); setQuote(null);
    onTraded(); loadHoldings();
  }

  if (!user) {
    return (
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "22px 26px", maxWidth: 420 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{mode === "signup" ? "Build your own portfolio" : "Log in"}</div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 18 }}>Everyone starts with $100,000 and free rein to invest.</div>
        <form onSubmit={handleAuthSubmit}>
          {mode === "signup" && (
            <label style={{ display: "block", marginBottom: 12, fontSize: 12, color: COLORS.muted }}>
              Display name (shown on leaderboard)
              <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. TrendTrader22" />
            </label>
          )}
          <label style={{ display: "block", marginBottom: 12, fontSize: 12, color: COLORS.muted }}>
            Email
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label style={{ display: "block", marginBottom: 16, fontSize: 12, color: COLORS.muted }}>
            Password
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <div style={{ color: COLORS.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={authLoading} style={{ ...btnStyle, width: "100%" }}>
            {authLoading ? "Please wait…" : mode === "signup" ? "Create account & get $100,000" : "Log in"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", fontSize: 12, marginTop: 14 }}>
          {mode === "signup" ? "Already have an account? Log in" : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  }

  if (!myPortfolio) return <div style={{ color: COLORS.muted, fontSize: 13 }}>Loading your portfolio…</div>;

  const marketValue = positions.reduce((s, p) => s + (livePrices[p.ticker] ?? (p.costBasis / p.shares)) * p.shares, 0);
  const totalValue = myPortfolio.cash_balance + marketValue;
  const totalGL = totalValue - myPortfolio.starting_cash;
  const totalGLPct = (totalGL / myPortfolio.starting_cash) * 100;
  const anyLive = Object.values(priceStatus).some(s => s === "live");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{myPortfolio.display_name}'s Portfolio</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>Cash available: {fmt(myPortfolio.cash_balance)}</div>
        </div>
        <button onClick={onLogout} style={{ ...btnStyle, background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}>Log out</button>
      </div>

      {positions.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <StatCard label="Total Portfolio Value" value={fmt(totalValue)} sub={pricesLoading ? "Updating…" : anyLive ? "Live pricing" : "Using last known price"} color={COLORS.text} size="lg" />
          <StatCard label="Total Gain / Loss" value={pct(totalGLPct)} sub={`${totalGL >= 0 ? "+" : ""}${fmt(totalGL)} vs $100,000 start`} color={totalGL >= 0 ? COLORS.green : COLORS.red} size="lg" />
        </div>
      )}

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px", maxWidth: 420, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>Buy a position</div>
        <form onSubmit={handleBuy}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={{ ...inputStyle, marginTop: 0, flex: 1 }} placeholder="Ticker (e.g. AAPL)" value={ticker} onChange={e => setTicker(e.target.value)} onBlur={lookupPrice} />
            <button type="button" onClick={lookupPrice} style={btnStyle}>Check</button>
          </div>
          {quote && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>{ticker.toUpperCase()} is trading at <strong style={{ color: COLORS.text }}>{fmt(quote)}</strong></div>}
          <input style={inputStyle} type="number" placeholder="Dollar amount to invest" value={amount} onChange={e => setAmount(e.target.value)} />
          {tradeError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 10 }}>{tradeError}</div>}
          <button type="submit" disabled={tradeLoading} style={{ ...btnStyle, width: "100%", marginTop: 12 }}>{tradeLoading ? "Buying…" : "Buy"}</button>
        </form>
      </div>

      {positions.length > 0 && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>Your Holdings</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: COLORS.dim }}>
                {lastLiveUpdate ? `Updated ${lastLiveUpdate.toLocaleTimeString()}` : "Loading prices…"}
              </span>
              <button
                type="button"
                onClick={() => refreshLivePrices(positions.map(p => p.ticker))}
                disabled={pricesLoading}
                style={{ ...btnStyle, padding: "4px 10px", fontSize: 11, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                {pricesLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>
          {positions.map(p => {
            const price = livePrices[p.ticker];
            const currentValue = (price ?? (p.costBasis / p.shares)) * p.shares;
            const gainLoss = currentValue - p.costBasis;
            const gainLossPct = (gainLoss / p.costBasis) * 100;
            const isLive = priceStatus[p.ticker] === "live";
            return (
              <div key={p.ticker} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.bg}`, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
                  {p.ticker}
                  {isLive && <span title="Live price" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green, display: "inline-block" }} />}
                </span>
                <span style={{ color: COLORS.muted }}>{p.shares.toFixed(3)} sh {price ? `@ ${fmt(price)}` : ""}</span>
                <span style={{ color: "#94a3b8" }}>{fmt(currentValue)}</span>
                <span style={{ color: gainLoss >= 0 ? COLORS.green : COLORS.red, minWidth: 70, textAlign: "right" }}>
                  {price ? pct(gainLossPct) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
