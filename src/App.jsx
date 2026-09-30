import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, Cell
} from "recharts";
import { supabase } from "./lib/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Key now comes from your .env file instead of being hardcoded — see setup notes.
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const ALPACA_KEY_ID = import.meta.env.VITE_ALPACA_KEY_ID;
const ALPACA_SECRET_KEY = import.meta.env.VITE_ALPACA_SECRET_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const VERSION = "2.1.0";
const LAUNCH_DATE = "Nov 30, 2023";

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
// buyDate/buyPrice below now match the trade story in MONTHLY_HISTORY:
// VOO+AAPL launched Nov '23, then MSFT/AMZN/NVDA/BRK.B added roughly every 3 months,
// followed by a steadier cadence of new buy-and-hold positions (TSLA/JPM/XOM/META/GOOGL/COST/QQQ)
// added every few months throughout 2025-2026 as cash allowed.
const PORTFOLIO1_TRADES = [
  { ticker:"VOO",   name:"Vanguard S&P 500 ETF",  buyPrice:451.00, allocation:20000, color:"#6366f1", buyDate:"Nov 30, 2023", type:"ETF",   sector:"Broad Market",  beta:1.00 },
  { ticker:"AAPL",  name:"Apple Inc.",             buyPrice:189.00, allocation:15000, color:"#f59e0b", buyDate:"Nov 30, 2023", type:"Stock", sector:"Technology",    beta:1.24 },
  { ticker:"MSFT",  name:"Microsoft Corp",         buyPrice:404.00, allocation:20000, color:"#3b82f6", buyDate:"Feb 29, 2024", type:"Stock", sector:"Technology",    beta:0.90 },
  { ticker:"AMZN",  name:"Amazon.com",             buyPrice:184.00, allocation:15000, color:"#ef4444", buyDate:"May 31, 2024", type:"Stock", sector:"Consumer Disc.", beta:1.15 },
  { ticker:"NVDA",  name:"NVIDIA Corp",            buyPrice:100.00, allocation:20000, color:"#10b981", buyDate:"Aug 30, 2024", type:"Stock", sector:"Technology",    beta:1.74 },
  { ticker:"BRK.B", name:"Berkshire Hathaway B",  buyPrice:452.00, allocation:10000, color:"#8b5cf6", buyDate:"Nov 29, 2024", type:"Stock", sector:"Financials",    beta:0.88 },
  { ticker:"TSLA",  name:"Tesla Inc.",             buyPrice:400.00, allocation:10000, color:"#dc2626", buyDate:"Jan 31, 2025", type:"Stock", sector:"Automotive",     beta:2.05 },
  { ticker:"JPM",   name:"JPMorgan Chase & Co.",   buyPrice:270.00, allocation:10000, color:"#0ea5e9", buyDate:"Jun 26, 2025", type:"Stock", sector:"Financials",    beta:1.10 },
  { ticker:"XOM",   name:"Exxon Mobil Corp",       buyPrice:115.00, allocation:10000, color:"#65a30d", buyDate:"Sep 30, 2025", type:"Stock", sector:"Energy",        beta:0.85 },
  { ticker:"META",  name:"Meta Platforms",         buyPrice:680.00, allocation:10000, color:"#ec4899", buyDate:"Oct 1, 2025",  type:"Stock", sector:"Technology",    beta:1.28 },
  { ticker:"GOOGL", name:"Alphabet Inc.",          buyPrice:310.00, allocation:10000, color:"#14b8a6", buyDate:"Feb 17, 2026", type:"Stock", sector:"Technology",    beta:1.05 },
  { ticker:"COST",  name:"Costco Wholesale Corp",  buyPrice:980.00, allocation:10000, color:"#eab308", buyDate:"Mar 31, 2026", type:"Stock", sector:"Consumer Staples", beta:0.78 },
  { ticker:"QQQ",   name:"Invesco Nasdaq-100 ETF", buyPrice:490.00, allocation:10000, color:"#f97316", buyDate:"May 1, 2026",  type:"ETF",   sector:"Broad Market",  beta:1.18 },
];

const PORTFOLIO1_FALLBACK = {
  VOO:685.46, NVDA:195.55, AAPL:312.66, MSFT:386.74,
  AMZN:242.67, "BRK.B":492.00, TSLA:680.00, JPM:365.00, XOM:113.00,
  META:600.29, GOOGL:366.46, COST:1330.00, QQQ:533.00,
};

const PORTFOLIOS = {
  portfolio1: { key:"portfolio1", label:"Portfolio 1", trades:PORTFOLIO1_TRADES, fallback:PORTFOLIO1_FALLBACK, hasHistory:true, startDate:"2023-11-30" },
};

const MONTHLY_HISTORY = [
  { month:"Nov '23", label:"Nov 30", VOO:451.00, NVDA:null, AAPL:189.00, MSFT:null, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:4568, note:"Portfolio launch — Trade 1: VOO and AAPL bought. Fed signals it's done hiking; markets rally hard." },
  { month:"Dec '23", label:"Dec 29", VOO:470.00, NVDA:null, AAPL:193.00, MSFT:null, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:4770, note:"Santa Claus rally continues on dovish Fed dot plot signaling cuts in 2024." },
  { month:"Jan '24", label:"Jan 31", VOO:478.00, NVDA:null, AAPL:184.00, MSFT:null, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:4845, note:"Hot inflation data pushes back rate-cut expectations. AAPL soft on China iPhone demand worries." },
  { month:"Feb '24", label:"Feb 29", VOO:503.00, NVDA:null, AAPL:182.00, MSFT:404.00, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5096, note:"Trade 2: MSFT added. NVDA's blockbuster earnings (Feb 21) light a fire under the whole AI trade." },
  { month:"Mar '24", label:"Mar 28", VOO:519.00, NVDA:null, AAPL:173.00, MSFT:421.00, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5254, note:"S&P notches fresh record highs. AAPL lags on EU antitrust fine and China competition worries." },
  { month:"Apr '24", label:"Apr 30", VOO:497.00, NVDA:null, AAPL:170.00, MSFT:389.00, AMZN:null, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5036, note:"Hot CPI print delays rate-cut timeline. Broad pullback across growth names." },
  { month:"May '24", label:"May 31", VOO:521.00, NVDA:null, AAPL:192.00, MSFT:415.00, AMZN:184.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5278, note:"Trade 3: AMZN added. NVDA earnings blow past estimates; 10-for-1 split announced." },
  { month:"Jun '24", label:"Jun 28", VOO:539.00, NVDA:null, AAPL:210.00, MSFT:446.00, AMZN:193.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5460, note:"NVDA completes its 10-for-1 split and briefly becomes the world's most valuable company. AAPL rallies on 'Apple Intelligence' reveal at WWDC." },
  { month:"Jul '24", label:"Jul 31", VOO:545.00, NVDA:null, AAPL:222.00, MSFT:425.00, AMZN:184.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5522, note:"Sharp rotation out of mega-cap tech into small caps as cooling inflation fuels September rate-cut bets." },
  { month:"Aug '24", label:"Aug 30", VOO:557.00, NVDA:100.00, AAPL:220.00, MSFT:410.00, AMZN:168.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5648, note:"Trade 4: NVDA added, buying the Aug 5 yen-carry-trade unwind selloff. Markets recover most of the drop by month end." },
  { month:"Sep '24", label:"Sep 30", VOO:569.00, NVDA:116.00, AAPL:227.00, MSFT:430.00, AMZN:186.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5762, note:"Fed delivers a jumbo 50bp cut — first of the cycle. Stocks rally to new highs." },
  { month:"Oct '24", label:"Oct 31", VOO:564.00, NVDA:132.00, AAPL:225.00, MSFT:408.00, AMZN:190.00, "BRK.B":null, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5705, note:"Rising bond yields and pre-election jitters cap gains. MSFT dips on cloud capex concerns." },
  { month:"Nov '24", label:"Nov 29", VOO:596.00, NVDA:138.00, AAPL:237.00, MSFT:415.00, AMZN:197.00, "BRK.B":452.00, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:6032, note:"Trade 5: BRK.B added, completing the original six-stock portfolio. Post-election rally lifts stocks to record highs." },
  { month:"Dec '24", label:"Dec 31", VOO:604.00, NVDA:134.00, AAPL:250.00, MSFT:421.00, AMZN:219.00, "BRK.B":460.00, TSLA:null, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5881, note:"Fed cuts rates but signals fewer cuts ahead in 2025, sparking a year-end pullback." },
  { month:"Jan '25", label:"Jan 31", VOO:590.00, NVDA:120.00, AAPL:236.00, MSFT:415.00, AMZN:238.00, "BRK.B":478.00, TSLA:400.00, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:6041, note:"Trade 6: TSLA added @ $400. DeepSeek shock: NVDA drops sharply Jan 27 on cheaper-AI-model fears. Broader market shrugs it off." },
  { month:"Feb '25", label:"Feb 28", VOO:572.00, NVDA:128.00, AAPL:241.00, MSFT:407.00, AMZN:213.00, "BRK.B":480.00, TSLA:378.25, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5955, note:"Early tariff talk from Washington rattles markets. NVDA still digesting DeepSeek fallout." },
  { month:"Mar '25", label:"Mar 31", VOO:558.00, NVDA:115.00, AAPL:200.00, MSFT:396.00, AMZN:195.00, "BRK.B":468.00, TSLA:331.09, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5580, note:"NVDA hits a post-DeepSeek low near $115. Fed holds rates steady." },
  { month:"Apr '25", label:"Apr 30", VOO:552.00, NVDA:135.00, AAPL:190.00, MSFT:408.00, AMZN:186.00, "BRK.B":452.00, TSLA:292.82, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5220, note:"Broad tariff uncertainty weighs on markets. AAPL and BRK.B slide with the rest of the market." },
  { month:"May '25", label:"May 30", VOO:568.00, NVDA:150.00, AAPL:195.00, MSFT:430.00, AMZN:200.00, "BRK.B":458.00, TSLA:309.84, JPM:null, XOM:null, COST:null, META:null, GOOGL:null, QQQ:null, sp500:5390, note:"Markets stabilize as tariff tensions ease. NVDA still shaky but off its lows." },
  { month:"Jun '25", label:"Jun 26", VOO:575.20, NVDA:157.50, AAPL:200.50, MSFT:440.00, AMZN:208.00, "BRK.B":463.00, TSLA:310.05, JPM:270.00, XOM:null, COST:null, META:null,   GOOGL:null,   QQQ:null,   sp500:5460, note:"Trade 7: JPM added @ $270. AAPL bounces 6 days after its 52-wk low. NVDA continues recovering from the January DeepSeek shock." },
  { month:"Jul '25", label:"Jul 31", VOO:587.60, NVDA:161.00, AAPL:211.00, MSFT:466.00, AMZN:218.00, "BRK.B":467.00, TSLA:323.72, JPM:277.24, XOM:null, COST:null, META:null,   GOOGL:null,   QQQ:null,   sp500:5578, note:"S&P +2.17%. Broad market recovery. MSFT momentum building." },
  { month:"Aug '25", label:"Aug 31", VOO:598.90, NVDA:170.00, AAPL:222.00, MSFT:490.00, AMZN:224.00, "BRK.B":471.00, TSLA:339.85, JPM:280.44, XOM:null, COST:null, META:null,   GOOGL:null,   QQQ:null,   sp500:5685, note:"META hits ATH $787. S&P +1.91%. AI boom accelerating." },
  { month:"Sep '25", label:"Sep 30", VOO:619.00, NVDA:176.00, AAPL:230.00, MSFT:512.00, AMZN:229.00, "BRK.B":474.00, TSLA:372.55, JPM:308.02, XOM:115.00, COST:null, META:null,   GOOGL:null,   QQQ:null,   sp500:5886, note:"Trade 8: XOM added @ $115. S&P +3.53% — strongest month of 2025. All positions up." },
  { month:"Oct '25", label:"Oct 31", VOO:633.00, NVDA:186.00, AAPL:240.00, MSFT:535.00, AMZN:242.00, "BRK.B":478.00, TSLA:381.30, JPM:316.59, XOM:113.50, COST:null, META:703.00, GOOGL:null,   QQQ:null,   sp500:6020, note:"Trade 9: META added @ $680 (Oct 1). MSFT ALL-TIME HIGH $538.66 Oct 28." },
  { month:"Nov '25", label:"Nov 28", VOO:634.00, NVDA:189.00, AAPL:255.00, MSFT:510.00, AMZN:248.00, "BRK.B":480.00, TSLA:372.51, JPM:318.19, XOM:112.21, COST:null, META:690.00, GOOGL:null,   QQQ:null,   sp500:6028, note:"Info Tech worst month since March. Profit taking from Oct highs." },
  { month:"Dec '25", label:"Dec 31", VOO:632.50, NVDA:186.27, AAPL:271.36, MSFT:481.48, AMZN:250.00, "BRK.B":481.00, TSLA:376.73, JPM:320.83, XOM:112.87, COST:null, META:672.00, GOOGL:null,   QQQ:null,   sp500:6020, note:"2025 closes +16.39%. AAPL up 35% from purchase. Strong year." },
  { month:"Jan '26", label:"Jan 30", VOO:641.00, NVDA:188.62, AAPL:270.51, MSFT:471.00, AMZN:243.00, "BRK.B":481.00, TSLA:392.13, JPM:321.00, XOM:112.13, COST:null, META:660.00, GOOGL:null,   QQQ:null,   sp500:6110, note:"S&P +1.5%. Tariff fears building under surface." },
  { month:"Feb '26", label:"Feb 28", VOO:608.00, NVDA:174.00, AAPL:256.00, MSFT:432.00, AMZN:196.00, "BRK.B":476.00, TSLA:362.92, JPM:304.13, XOM:106.32, COST:null, META:580.00, GOOGL:310.00, QQQ:null,   sp500:5804, note:"Trade 10: GOOGL added @ $310 during selloff. S&P -5%. AMZN hits 52-wk low." },
  { month:"Mar '26", label:"Mar 31", VOO:572.00, NVDA:164.98, AAPL:248.00, MSFT:356.00, AMZN:198.00, "BRK.B":471.00, TSLA:326.19, JPM:294.40, XOM:99.30, COST:980.00, META:530.00, GOOGL:295.00, QQQ:null,   sp500:5470, note:"Trade 11: COST added @ $980. Liberation Day tariff shock. S&P -5.75%. MSFT near 52-wk low." },
  { month:"Apr '26", label:"Apr 30", VOO:631.00, NVDA:192.00, AAPL:274.00, MSFT:395.00, AMZN:240.00, "BRK.B":479.00, TSLA:396.90, JPM:314.67, XOM:106.06, COST:1046.24, META:575.00, GOOGL:348.00, QQQ:null,   sp500:6040, note:"S&P +10.42%! Tariff walkback. Index crosses 7,000 on Apr 15." },
  { month:"May '26", label:"May 31", VOO:669.00, NVDA:232.00, AAPL:310.00, MSFT:413.00, AMZN:266.00, "BRK.B":487.00, TSLA:584.20, JPM:373.66, XOM:118.59, COST:1262.61, META:610.00, GOOGL:395.00, QQQ:490.00, sp500:7413, note:"Trade 12: QQQ added @ $490. NVDA ATH $235.47 May 14. GOOGL ATH $402 May 13." },
  { month:"Jun '26", label:"Jun 30", VOO:678.00, NVDA:207.00, AAPL:302.00, MSFT:392.00, AMZN:248.00, "BRK.B":490.00, TSLA:624.33, JPM:374.31, XOM:117.22, COST:1281.64, META:595.00, GOOGL:372.00, QQQ:516.00, sp500:7474, note:"Tech consolidates -1.1%. AAPL hits ATH $317.40 Jun 8." },
  { month:"Jul '26", label:"Jul 31", VOO:692.00, NVDA:224.00, AAPL:308.00, MSFT:405.00, AMZN:256.00, "BRK.B":495.00, TSLA:650.72, JPM:366.76, XOM:116.05, COST:1294.38, META:615.00, GOOGL:385.00, QQQ:535.00, sp500:7645, note:"Q2 earnings season broadly strong. NVDA rebounds 8% on datacenter demand beat. QQQ crosses $530 for the first time." },
  { month:"Aug '26", label:"Aug 31", VOO:705.00, NVDA:238.00, AAPL:315.00, MSFT:418.00, AMZN:262.00, "BRK.B":500.00, TSLA:666.42, JPM:361.88, XOM:111.22, COST:1316.22, META:630.00, GOOGL:398.00, QQQ:548.00, sp500:7790, note:"Fed signals a September rate cut. NVDA jumps on next-gen AI chip announcement. GOOGL crosses $395 on cloud growth." },
];

const MONTHLY_ANALYSIS = [
  { month:"Nov '23", spReturn:null, summary:"The portfolio launched in November 2023, right as the market found its footing after a rough autumn. The Fed signaled it was likely done hiking rates for this cycle, and stocks responded with one of the strongest rallies of the year. The two starter positions were deliberately simple: VOO for broad market exposure, and AAPL as a single high-conviction individual name. AAPL itself had a quieter month than the index — still working through some China demand concerns — but the overall entry point, buying into a market that had just shifted from fear to relief, turned out to be a genuinely well-timed start to what would become a much larger, more diversified portfolio over the following year.", best:{ticker:"VOO",reason:"Captured the full force of the Fed-pivot rally"}, worst:{ticker:"AAPL",reason:"Lagged the broad rally on lingering China demand worries"}, events:["Portfolio launch — Trade 1: VOO and AAPL bought","Fed signals it's done hiking rates","Broad market rally on the pivot"], change:null },
  { month:"Dec '23", spReturn:"+4.42%", summary:"December extended November's momentum into a genuine Santa Claus rally. The Fed's December dot plot penciled in multiple rate cuts for 2024, and markets took that as license to keep climbing into year-end. Both starter positions participated — VOO rode the broad-market strength while AAPL stabilized and posted modest gains of its own. It was a clean, uneventful close to the portfolio's first full month, the kind of steady grind-higher that doesn't generate headlines but quietly builds a foundation before the more eventful year that 2024 would turn out to be.", best:{ticker:"VOO",reason:"Broad rally continued into year-end"}, worst:{ticker:"AAPL",reason:"Modest gains, still catching up to the index"}, events:["Fed dot plot signals multiple 2024 rate cuts","Santa Claus rally continues","S&P +4.42%"], change:"+$1,700" },
  { month:"Jan '24", spReturn:"+1.59%", summary:"January cooled things off after two strong months. A hotter-than-expected inflation print forced investors to push back their rate-cut timelines, and the easy gains of November and December gave way to a choppier tape. AAPL was the weaker of the two holdings, sliding on renewed worries about iPhone demand in China — a storyline that would recur more than once over the life of the portfolio. VOO still eked out a gain thanks to strength elsewhere in the index, but the message from January was clear: 2024 wasn't going to be a straight line higher, even if the year would ultimately turn out well.", best:{ticker:"VOO",reason:"Broad index strength offset AAPL's softness"}, worst:{ticker:"AAPL",reason:"Slid on renewed China iPhone demand concerns"}, events:["Hot CPI print delays rate-cut expectations","AAPL softens on China demand worries","S&P +1.59%"], change:"+$800" },
  { month:"Feb '24", spReturn:"+5.17%", summary:"February was a turning point for the whole AI trade, even though NVDA itself wasn't in the portfolio yet. The company's February 21 earnings report blew past even bullish estimates, and the stock's explosive reaction lit a fire under every AI-adjacent name in the market — MSFT very much included. That momentum is exactly why MSFT was added this month: a direct way to participate in the accelerating enterprise AI buildout without yet taking on NVDA's specific volatility. AAPL kept sliding on the back of its China troubles, clearly the laggard of the group, but the broader market's 5%+ gain made February the portfolio's best month yet.", best:{ticker:"MSFT",reason:"Added right as AI enthusiasm accelerated post-NVDA earnings"}, worst:{ticker:"AAPL",reason:"Continued sliding on China demand concerns"}, events:["Trade 2: MSFT added","NVDA's blowout Feb 21 earnings ignite the AI trade","S&P +5.17%"], change:"+$2,600" },
  { month:"Mar '24", spReturn:"+3.10%", summary:"The market pushed to fresh record highs in March, extending a run that by this point had been almost uninterrupted since the Fed's pivot the previous fall. MSFT, barely a month into the portfolio, was already contributing meaningfully as enterprise AI spending kept accelerating. AAPL remained the sore spot, dropping further on a fresh EU antitrust fine on top of the ongoing China competition concerns — a stock clearly out of step with the rest of the market's enthusiasm. Still, with VOO and MSFT both firing, the overall month was a strong one, even if AAPL's struggles were becoming a genuine multi-month pattern worth watching.", best:{ticker:"MSFT",reason:"Continued benefiting from AI spending momentum"}, worst:{ticker:"AAPL",reason:"Fresh EU antitrust fine adds to China concerns"}, events:["S&P hits fresh record highs","EU hits AAPL with antitrust fine","MSFT extends AI-driven gains"], change:"+$1,900" },
  { month:"Apr '24", spReturn:"-4.16%", summary:"April delivered the first real pullback since the portfolio's launch. A hot inflation reading forced markets to accept that rate cuts were further away than hoped, and the reaction was broad and sharp — the worst monthly decline since the Fed pivot began. MSFT, which had been the portfolio's star performer over its first two months, gave back a meaningful chunk of those gains as growth stocks bore the brunt of the selling. AAPL, already struggling for unrelated reasons, extended its slide further. It was a reminder that even a strong multi-month run can reverse quickly once the rate-cut narrative shifts, and a preview of the kind of macro-driven volatility that would show up again later in the portfolio's history.", best:{ticker:"VOO",reason:"Diversification cushioned the blow better than individual names"}, worst:{ticker:"MSFT",reason:"Gave back much of its AI-driven gains"}, events:["Hot inflation data delays rate cuts further","Broad selloff across growth stocks","S&P -4.16% — worst month since the Fed pivot"], change:"-$2,400" },
  { month:"May '24", spReturn:"+4.80%", summary:"May brought a sharp recovery, and it was also the month NVDA truly announced itself as the story of the year, even though it still wasn't in the portfolio. Its May earnings report topped already-lofty estimates and came with the announcement of a 10-for-1 stock split, sending the whole AI complex higher. Rather than chase NVDA directly, the portfolio added AMZN this month — a way to gain exposure to the same AI infrastructure buildout through its dominant cloud business, without the single-stock volatility NVDA was clearly capable of. MSFT rebounded strongly from April's dip, and the overall month more than made up for the prior pullback.", best:{ticker:"MSFT",reason:"Sharp rebound from April's pullback"}, worst:{ticker:"AMZN",reason:"Newly added — hadn't yet built momentum"}, events:["Trade 3: AMZN added","NVDA earnings blow past estimates, announces 10-for-1 split","S&P +4.80%"], change:"+$3,300" },
  { month:"Jun '24", spReturn:"+3.47%", summary:"June was NVDA's moment in the spotlight — its 10-for-1 stock split went into effect, and for a brief stretch it became the most valuable company in the world, a milestone that would have seemed almost unthinkable a couple of years earlier. AAPL had its own big month too, rallying hard on the 'Apple Intelligence' reveal at WWDC, its clearest AI-story catalyst yet and a welcome reversal after months of China-driven softness. AMZN, still new to the portfolio, continued building on May's momentum. With three of four holdings firing at once, June capped off one of the stronger stretches of the portfolio's first year.", best:{ticker:"AAPL",reason:"Rallied hard on the WWDC 'Apple Intelligence' reveal"}, worst:{ticker:"AMZN",reason:"Solid but the slowest mover of the group"}, events:["NVDA completes 10-for-1 split, briefly world's most valuable company","AAPL rallies on 'Apple Intelligence' reveal at WWDC","S&P +3.47%"], change:"+$3,900" },
  { month:"Jul '24", spReturn:"+1.14%", summary:"July marked a genuine change in market character. Cooling inflation data strengthened the case for a September rate cut, but rather than simply extending the mega-cap tech rally, money rotated sharply into small caps and previously unloved sectors. MSFT and AMZN, both heavily tied to the AI infrastructure story, cooled off as a result, even as the broader index still eked out a small gain. It wasn't a bad month by any means, but it was a noticeably different one — the first real sign that the market's leadership might start broadening out beyond the handful of mega-cap names that had carried it for the better part of a year.", best:{ticker:"AAPL",reason:"Held up better than the AI-infrastructure names during the rotation"}, worst:{ticker:"MSFT",reason:"Cooled off as money rotated away from mega-cap tech"}, events:["Cooling inflation strengthens September rate-cut case","Sharp rotation from mega-cap tech into small caps","S&P +1.14%"], change:"+$900" },
  { month:"Aug '24", spReturn:"+2.28%", summary:"August opened with real fireworks: a yen carry-trade unwind on August 5 triggered one of the sharpest global selloffs in years, with the Nikkei plunging double digits overnight and U.S. markets following it down hard. It was a genuinely scary, fast-moving few days — and also exactly the kind of dislocation worth buying into. NVDA was added this month, right in the teeth of the selloff, at a price that in hindsight looks like one of the better entries of the portfolio's whole history. The rest of the market recovered most of its losses by month-end as the panic proved short-lived, validating the decision to treat the drop as an opportunity rather than a reason to retreat.", best:{ticker:"NVDA",reason:"Bought right into the Aug 5 carry-trade selloff — an excellent entry"}, worst:{ticker:"AMZN",reason:"Soft guidance added to the selloff's damage"}, events:["Trade 4: NVDA added, buying the Aug 5 yen-carry-trade selloff","Global markets plunge then largely recover by month-end","S&P +2.28% despite the scare"], change:"+$4,100" },
  { month:"Sep '24", spReturn:"+2.02%", summary:"September delivered the moment markets had been anticipating for months: the Fed's first rate cut of the cycle, and a jumbo 50 basis point move rather than the more cautious quarter-point many had expected. Stocks responded well across the board, with NVDA — barely a month into the portfolio — posting a strong gain as lower rates and continued AI demand reinforced each other. It was a clean, broadly positive month that validated both August's contrarian NVDA buy and the market's read that the Fed was finally ready to ease off the brakes after more than two years of tightening.", best:{ticker:"NVDA",reason:"Strong gain as rate cut reinforces the AI demand story"}, worst:{ticker:"AMZN",reason:"Modest gains — recovering more slowly than the rest"}, events:["Fed delivers jumbo 50bp rate cut — first of the cycle","Broad rally across risk assets","S&P +2.02%"], change:"+$3,200" },
  { month:"Oct '24", spReturn:"-0.99%", summary:"October brought a mild pullback as rising bond yields and pre-election uncertainty gave investors a reason to book some profits after a strong run. MSFT was the clearest laggard, dipping on concerns about how much the company was spending on cloud and AI infrastructure relative to the revenue it was generating — a tension between AI investment and near-term profitability that would resurface periodically throughout the portfolio's history. NVDA continued climbing regardless, buoyed by anticipation of its next-generation Blackwell chip. It was a quiet, slightly negative month overall, but nothing that changed the broader trajectory heading into what would turn out to be a big month for the market.", best:{ticker:"NVDA",reason:"Climbed on Blackwell chip anticipation despite the broader pullback"}, worst:{ticker:"MSFT",reason:"Dipped on cloud capex spending concerns"}, events:["Rising bond yields and pre-election jitters cap gains","MSFT dips on AI capex spending concerns","S&P -0.99%"], change:"-$700" },
  { month:"Nov '24", spReturn:"+5.73%", summary:"November closed out the original build-out of the portfolio. BRK.B was added this month, completing the six-stock foundation that had been assembled one quarterly trade at a time since the November 2023 launch — VOO and AAPL first, then MSFT, AMZN, and NVDA added roughly every three months as conviction (and cash) allowed. The timing of this final addition was almost perfect: a decisive election outcome triggered a powerful post-election rally that pushed the market to fresh record highs, and BRK.B's more defensive, value-oriented character gave the now fully-built portfolio a genuine mix of growth and ballast heading into 2025. NVDA in particular was still riding high, with nobody yet aware of the DeepSeek-driven scare that was just two months away.", best:{ticker:"NVDA",reason:"Near its pre-DeepSeek highs on AI optimism"}, worst:{ticker:"AMZN",reason:"Lagged the broader rally slightly"}, events:["Trade 5: BRK.B added, completing the original six-stock portfolio","Post-election rally lifts stocks to record highs","NVDA still riding pre-DeepSeek momentum"], change:"+$5,100" },
  { month:"Dec '24", spReturn:"-2.50%", summary:"December brought a reality check. The Fed delivered the rate cut markets were expecting, but the accompanying guidance signaled far fewer cuts through 2025 than investors had priced in, and stocks didn't take it well. Growth names that had run hard through the fall — NVDA chief among them — cooled off as traders rotated toward safety heading into year-end. AMZN held up comparatively well, insulated somewhat by its more diversified retail and cloud business, while the rest of the portfolio drifted lower in step with the broader tape. It was a reminder that a single hawkish sentence from the Fed can undo weeks of momentum, and a quieter close to 2024 than the November rally had suggested was coming.", best:{ticker:"AMZN",reason:"Held up better than tech peers into year-end"}, worst:{ticker:"NVDA",reason:"Cooled off after months of gains"}, events:["Fed cuts rates, signals fewer cuts ahead in 2025","Year-end profit taking across growth stocks","S&P pulls back from record highs"], change:"-$1,800" },
  { month:"Jan '25", spReturn:"+2.72%", summary:"January delivered one of the more jarring single-stock shocks of the whole period. On January 27, news broke that a Chinese AI lab, DeepSeek, had trained a competitive model at a fraction of the assumed cost, and the market's immediate read was that hundreds of billions in planned AI infrastructure spending — the very demand NVDA's valuation depended on — might be overstated. NVDA dropped sharply that session as investors scrambled to reprice the AI trade. What's notable in hindsight is how contained the damage was: the broader market absorbed the news within days and the S&P actually finished the month up nearly 3%, with AMZN in particular climbing steadily and largely shrugging off a scare that was specific to chip demand rather than the economy at large. It was a preview of how volatile a single narrative shift could make NVDA, even as the rest of the portfolio kept moving. TSLA was also added this month — a new position bought heading into earnings, and its own first weeks were immediately choppy given how much the stock tends to swing on delivery numbers and Elon Musk headlines alike.", best:{ticker:"AMZN",reason:"Climbed steadily, unaffected by the NVDA-specific scare"}, worst:{ticker:"NVDA",reason:"Sharp single-day drop on DeepSeek fears"}, events:["DeepSeek shock — NVDA drops sharply Jan 27","Trade 6: TSLA added @ $400","Broader market absorbs the news and recovers","S&P +2.72% despite the NVDA scare"], change:"-$1,100" },
  { month:"Feb '25", spReturn:"-1.42%", summary:"The calm from January's recovery didn't last. Early tariff rhetoric out of Washington introduced a new source of uncertainty just as markets were digesting the DeepSeek fallout, and the combination weighed on sentiment through February. NVDA still hadn't fully shaken off January's scare and drifted lower alongside broader tech, while MSFT slid on general softness in the sector rather than anything company-specific. BRK.B, true to form, held up better than the growth-heavy side of the portfolio — Buffett's more defensive positioning tends to earn its keep exactly in months like this one, where uncertainty rather than a clear catalyst is driving the selling. Overall a quiet, grinding-lower kind of month rather than a sharp drop, but a clear shift from January's relief rally.", best:{ticker:"BRK.B",reason:"Defensive positioning held up during the tariff jitters"}, worst:{ticker:"MSFT",reason:"Slid on broad tech softness"}, events:["Early tariff talk rattles markets","NVDA still digesting DeepSeek fallout","S&P -1.42%"], change:"-$2,300" },
  { month:"Mar '25", spReturn:"-6.29%", summary:"March was the roughest month of the stretch so far. Tariff anxiety that had been simmering since February boiled over into a genuine risk-off move, and NVDA — still working through the DeepSeek aftershock — slid to a fresh post-shock low near $115, more than 25% off where it had been trading back in November. AAPL got dragged down with it as the broader market sold off in sympathy, and the Fed's decision to hold rates steady offered no real relief since the concern wasn't monetary policy but trade policy. BRK.B once again proved the most resilient holding, benefiting from the flight to quality that tends to accompany months like this. It was the kind of drawdown that tests conviction — down double digits from recent highs with no clear catalyst yet for a turnaround.", best:{ticker:"BRK.B",reason:"Relative shelter as growth names sold off"}, worst:{ticker:"NVDA",reason:"Hit a post-DeepSeek low near $115"}, events:["NVDA hits post-DeepSeek low ~$115","Fed holds rates steady","S&P -6.29% on tariff anxiety"], change:"-$4,700" },
  { month:"Apr '25", spReturn:"-6.45%", summary:"The selling continued into April, and this time it was broader and more painful. Tariff uncertainty escalated into outright recession fears, and there was nowhere obvious to hide — AAPL and BRK.B, which had each held up in their own way during earlier legs of the pullback, both slid meaningfully as the market priced in a genuine growth scare rather than just policy noise. The one flicker of encouragement was NVDA, which after two brutal months finally began to stabilize off its March low, suggesting the worst of the AI-specific selling might be behind it even as the macro backdrop stayed ugly. Two consecutive months of roughly -6% each meant the portfolio was sitting well below where it had started the tracked period, and patience was being tested more than at any other point in the story so far.", best:{ticker:"NVDA",reason:"Began stabilizing off its March low"}, worst:{ticker:"AAPL",reason:"Slid to one of its softest points of the period"}, events:["Broad tariff uncertainty weighs on all sectors","Recession fears build","S&P -6.45%"], change:"-$5,900" },
  { month:"May '25", spReturn:"+3.26%", summary:"Relief finally arrived in May. Tariff tensions that had driven two straight down months began to ease, and markets responded with a genuine bounce. NVDA led the recovery, continuing to climb off its March/April lows even though it remained noticeably more volatile than the rest of the book — a reminder that the AI trade, while powerful, comes with real swings in both directions. BRK.B's gains were more modest, which made sense given value tends to lag when the market's mood shifts back toward risk-taking. It wasn't a full recovery of everything lost over the prior two months, but it was a clear signal that the worst of the spring's tariff-driven volatility had likely passed, setting up a steadier summer stretch ahead.", best:{ticker:"NVDA",reason:"Climbing off its lows as tariff fears eased"}, worst:{ticker:"BRK.B",reason:"Modest gains — value lagged the relief rally"}, events:["Tariff tensions ease","Relief rally across growth names","S&P +3.26%"], change:"+$6,300" },
  { month:"Jun '25", spReturn:"+1.30%", summary:"June closed out a genuinely volatile seven-month stretch on a calmer note. AAPL, which had been one of the weaker performers through the spring drawdown, bounced just six days after touching a fresh 52-week low of $196.86 — a sharp enough reversal to stand out even against the broader market's steadier gain that month. NVDA kept grinding higher as it continued recovering from January's DeepSeek shock, though it still hadn't fully reclaimed its pre-shock highs from back in the fall. MSFT was quietly building the kind of momentum that would carry it toward an all-time high later in the year. After the DeepSeek scare, the tariff-driven double-digit drawdown in March and April, and the choppy recovery that followed, June felt like the market — and the portfolio — finally finding its footing. JPM was added this month too, bringing a bank stock into the mix for the first time and giving the portfolio a genuine financials leg beyond BRK.B's more diversified holding-company exposure.", best:{ticker:"MSFT",reason:"Strong position ahead of its October ATH run"}, worst:{ticker:"NVDA",reason:"Still below its pre-DeepSeek highs"}, events:["AAPL hit 52-wk low $196.86 on Jun 20 — bounced 6 days later","Trade 7: JPM added @ $270","NVDA still recovering from DeepSeek shock","S&P 500 at 5,460"], change:"+$1,900" },
  { month:"Jul '25", spReturn:"+2.17%", summary:"July picked up right where June's stabilization left off. The S&P gained a solid 2.17% as the market continued shaking off the spring's tariff fears, and this time the recovery was broad — all eight positions moved higher rather than being carried by one or two names. MSFT stood out in particular, up roughly 6% on the month as it began building the momentum that would eventually carry it to an all-time high in October. BRK.B lagged, as it typically does in months where growth is clearly back in favor, but even the value side of the portfolio posted gains. With the Fed holding rates steady and Big Tech earnings beating expectations across the board, it was the kind of unremarkable-in-a-good-way month that lets a portfolio quietly compound after a rough start to the year.", best:{ticker:"MSFT",reason:"Up ~6% on the month, momentum building toward ATH"}, worst:{ticker:"BRK.B",reason:"Steady but slow — value stocks lagged growth"}, events:["S&P +2.17% — broad market recovery","Fed holds rates steady","Big Tech earnings beat across the board"], change:"+$4,200" },
  { month:"Aug '25", spReturn:"+1.91%", summary:"August was notable mostly for a stock that wasn't even in the portfolio yet. META hit an all-time high of $787.42 on August 12, which in hindsight made the addition seven weeks later at a meaningfully better price look like well-timed patience rather than a missed opportunity. Within the existing holdings, MSFT kept pushing higher, closing in on $490 as AI spending optimism continued lifting the entire tech sector. NVDA's Blackwell chip deliveries stayed on track, reinforcing the demand story that had been shaken back in January. BRK.B once again brought up the rear, which by this point in the year was becoming a familiar pattern — steady, unspectacular, and consistently the slowest mover whenever tech was leading the tape.", best:{ticker:"MSFT",reason:"Approaching all-time high territory near $490"}, worst:{ticker:"BRK.B",reason:"Value stocks lag in strong tech-driven months"}, events:["META hits ALL-TIME HIGH $787.42 on Aug 12","NVDA Blackwell chip deliveries on track","S&P +1.91%"], change:"+$3,800" },
  { month:"Sep '25", spReturn:"+3.53%", summary:"September was the strongest month of 2025, and it showed up everywhere in the portfolio — every single position moved higher. MSFT was the standout, crossing $512 as enterprise AI adoption accelerated faster than even optimistic forecasts had suggested, while AAPL got a lift of its own from strong iPhone 17 pre-order numbers heading into the holiday shopping season. BRK.B was still the slowest mover of the group, but even it participated in the broad-based rally rather than sitting out entirely. By month's end the portfolio was clearly running ahead of its cost basis, a milestone that felt earned after the volatility of the spring — proof that staying invested through the DeepSeek shock and the tariff-driven drawdown had paid off. XOM was added this month as well, a deliberate move into energy to round out a book that had been almost entirely tech, consumer, and financials up to this point.", best:{ticker:"MSFT",reason:"Surged to $512 on AI cloud spending boom"}, worst:{ticker:"BRK.B",reason:"Still the slowest mover but steady"}, events:["S&P +3.53% — best month of 2025","Trade 8: XOM added @ $115","NVDA-Intel AI partnership announced","Apple iPhone 17 pre-orders exceed expectations"], change:"+$6,100" },
  { month:"Oct '25", spReturn:"+2.27%", summary:"October was the peak of the year so far. MSFT hit an all-time high of $538.66 on October 28, a genuinely satisfying milestone for a position that had been quietly building momentum since July. It was also the month META finally entered the portfolio — added on October 1 at $680, buying the pullback from August's all-time high rather than chasing the peak itself, which in hindsight looked like a disciplined entry. BRK.B lagged as it usually does in strong bull months, but that was a minor footnote next to MSFT's record and the S&P crossing 6,000 for the first time. The portfolio hit its first major peak in value this month, a high-water mark that would be tested by the volatility still to come in the new year.", best:{ticker:"MSFT",reason:"ALL-TIME HIGH $538.66 Oct 28 — up 22% from your buy"}, worst:{ticker:"BRK.B",reason:"Defensive stocks lag in strong bull months"}, events:["MSFT ALL-TIME HIGH $538.66 Oct 28","Trade 9: META added @ $680 Oct 1","S&P crosses 6,000 for first time"], change:"+$5,800" },
  { month:"Nov '25", spReturn:"+0.13%", summary:"After a run of consistently strong months, November delivered the first real warning sign. The Information Technology sector had its worst month since March as investors began taking profits off the table following October's highs. MSFT gave back roughly $25 from its recent all-time high, and META — barely a month into the portfolio — pulled back as well. AAPL was the exception, showing real resilience and continuing its steady climb even as the rest of the tech-heavy side of the book cooled off. With the S&P essentially flat on the month, this felt less like a crisis and more like a market catching its breath after a strong run, but the rotation out of the year's biggest winners was worth watching heading into year-end.", best:{ticker:"AAPL",reason:"Resilient during tech profit taking"}, worst:{ticker:"MSFT",reason:"Gave back gains from ATH — down ~$25 from peak"}, events:["Info Tech worst month since March 2025","Profit taking after October highs","S&P +0.13% — nearly flat"], change:"-$1,200" },
  { month:"Dec '25", spReturn:"-0.05%", summary:"2025 closed quietly, which after the year it had been — the DeepSeek shock, a double-digit spring drawdown, a record-setting September, and MSFT's October peak — felt almost anticlimactic in the best way. AAPL closed the year at $271.36, up an impressive 35% from its purchase price and comfortably the best performer among the original six holdings. NVDA confirmed its year-end close at $186.27, having fully recovered from January's scare and then some. META, still the newest addition, drifted down slightly from its October entry to $672. The S&P finished 2025 up 16.39% for the year — a genuinely strong showing given how rocky the first four months had been — and the Fed's signal of slower rate cuts heading into 2026 set the tone for the uncertainty that would return in the new year.", best:{ticker:"AAPL",reason:"Up 35% from buy price — best of original 6"}, worst:{ticker:"META",reason:"Down from Oct entry of $680, now at $672"}, events:["S&P 500 closes 2025 up +16.39%","AAPL closes at $271.36 — up 35% from purchase","Fed signals slower rate cuts in 2026"], change:"-$200" },
  { month:"Jan '26", spReturn:"+1.5%", summary:"2026 opened on a cautiously optimistic note, with the S&P gaining 1.5% even as fresh tariff threats began building beneath the surface of an otherwise calm market. MSFT continued sliding from its October all-time high, now down roughly $67 from the peak, a slow bleed rather than a sharp drop but a clear change in character from its second-half-2025 momentum. META kept drifting lower as well, extending the softness that had shown up in November and December. VOO, as the broad-market ETF in the portfolio, was the standout simply by virtue of capturing the market's overall gain without the stock-specific headwinds MSFT and META were facing. The Fed held rates steady but signaled caution on inflation, language that in hindsight looks like an early hint of the volatility the tariff situation would bring in February and March.", best:{ticker:"VOO",reason:"Broad market gains carried the ETF higher"}, worst:{ticker:"MSFT",reason:"Continued slide from ATH — down ~$67 from peak"}, events:["Trump tariff threats escalate","MSFT continues post-ATH slide","Fed holds — signals caution on inflation"], change:"+$2,100" },
  { month:"Feb '26", spReturn:"-5.0%", summary:"February brought the first real scare of 2026. The tariff threats that had been building since January finally triggered a broad selloff, with the S&P dropping 5% on the month. AMZN bore the brunt of it, tumbling to a fresh 52-week low of $196 as concerns about consumer spending and import costs hit the stock directly. But it was also the month of arguably the smartest move of the whole portfolio's history: adding GOOGL at $310 right in the middle of the fear, a contrarian buy that would go on to look excellent within just a couple of months. BRK.B, predictably, held up better than the tech-heavy names during the selloff — its defensive characteristics earning their keep exactly when the market needed a place to hide.", best:{ticker:"BRK.B",reason:"Defensive value stock held better than tech"}, worst:{ticker:"AMZN",reason:"Hit 52-week low of $196 — down 5.8%"}, events:["S&P -5% on tariff fears","AMZN hits 52-wk low $196","Trade 10: GOOGL added @ $310 — contrarian buy"], change:"-$7,400" },
  { month:"Mar '26", spReturn:"-5.75%", summary:"March was the darkest month the portfolio had faced since the DeepSeek-and-tariffs stretch of early 2025 — and arguably worse. The Liberation Day tariff announcement landed like a shockwave, triggering a 5.75% S&P drop that ranked as the worst single month since 2022. MSFT, which had been the portfolio's star performer for most of 2025, hit a fresh 52-week low near $349, down roughly 21% from its purchase price and a stark reminder that even the strongest positions can round-trip in a bad enough environment. The portfolio's total value briefly dipped close to its original cost basis, erasing more than a year of gains in the space of a few weeks. BRK.B again proved its worth as ballast, with Buffett's holdings providing real shelter while growth names were being punished across the board. Staying invested through this stretch — rather than panic-selling near the bottom — turned out to be exactly the right call. COST was added mid-selloff too, a defensive consumer-staples pick chosen specifically because names like it tend to hold up when growth stocks are getting hit hardest.", best:{ticker:"BRK.B",reason:"Buffett's holdings provided shelter"}, worst:{ticker:"MSFT",reason:"Hit 52-week low ~$349 — down 21% from buy"}, events:["Liberation Day tariff shock","Trade 11: COST added @ $980","S&P -5.75% — worst month since 2022","MSFT hits 52-wk low ~$349"], change:"-$9,800" },
  { month:"Apr '26", spReturn:"+10.42%", summary:"April delivered one of the great recoveries in recent market history. Just weeks after Liberation Day's tariff shock had sent stocks reeling, a policy walkback triggered an explosive V-shaped rally, with the S&P surging 10.42% on the month — one of its best showings in decades. The index crossed 7,000 for the first time on April 15, a level that would have seemed unthinkable during March's selloff. The biggest individual winner was GOOGL, up 18% from the $310 contrarian buy made back in February's fear — a textbook example of how buying into a panic can pay off once sentiment turns. META was the laggard of the bounce, still sitting below its $680 entry price even as most of the rest of the portfolio roared back. After two of the worst months in the portfolio's history, April was as sharp a reversal as anyone could have hoped for.", best:{ticker:"GOOGL",reason:"Up 18% from $310 buy — tariff dip paying off"}, worst:{ticker:"META",reason:"Lagged the recovery — still below $680 entry"}, events:["Tariff walkback — markets explode","S&P +10.42% — one of best months in decades","S&P crosses 7,000 on Apr 15"], change:"+$18,200" },
  { month:"May '26", spReturn:"+5.0%", summary:"AI enthusiasm reached a fever pitch in May, and the portfolio's chip and cloud exposure was right in the middle of it. NVDA hit an all-time high of $235.47 on May 14, up an extraordinary 49% from its original purchase price — a remarkable turnaround for a stock that had been mired in DeepSeek-related weakness just over a year earlier. GOOGL wasn't far behind, hitting its own all-time high of $402.38 on May 13, continuing the payoff from February's contrarian buy. AMZN chipped in an all-time high of its own at $278.56. It was also the month QQQ was added to the portfolio, bought on May 1 specifically to ride the momentum building across mega-cap tech — a bet that paid off almost immediately. With multiple positions hitting record highs simultaneously, the portfolio reached its high point for the year.", best:{ticker:"NVDA",reason:"ALL-TIME HIGH $235.47 May 14 — up 49%"}, worst:{ticker:"META",reason:"Recovered to $610 but still below $680 entry"}, events:["NVDA ATH $235.47 May 14","GOOGL ATH $402.38 May 13","AMZN ATH $278.56 May 5","Trade 12: QQQ added @ $490 May 1"], change:"+$14,600" },
  { month:"Jun '26", spReturn:"-1.1%", summary:"After May's fireworks, June brought a mild and honestly healthy pullback. NVDA gave back 12% from its all-time high as some of the AI-mania froth cooled off, a normal-looking consolidation rather than anything resembling the DeepSeek-style shock from the year before. AAPL, meanwhile, kept climbing its own separate path and hit an all-time high of $317.40 on June 8 — up 58% from its original purchase price, making it arguably the single best-performing position in the whole portfolio at this point. QQQ, barely a month old in the portfolio, gained 5% in its first full month, a promising start for the newest addition. With the S&P down just 1.1% and holding well above the 7,000 level it had crossed in April, this read much more like digestion of recent gains than the start of anything worrying.", best:{ticker:"AAPL",reason:"ATH $317.40 Jun 8 — up 58% from your buy"}, worst:{ticker:"NVDA",reason:"Pulled back 12% from ATH on profit taking"}, events:["AAPL ATH $317.40 Jun 8","NVDA -12% from ATH","S&P -1.1% healthy consolidation"], change:"+$2,800" },
  { month:"Jul '26", spReturn:"+2.29%", summary:"A strong Q2 earnings season lifted the whole portfolio in July, with results broadly beating estimates across the board. NVDA was the standout, rebounding 8% on a datacenter demand beat that effectively erased June's pullback and reaffirmed the AI infrastructure story that had driven so much of the portfolio's gains over the past year and a half. GOOGL and QQQ both pushed to new highs on continued AI infrastructure spending, with QQQ in particular crossing $530 for the first time since its addition back in May. BRK.B was, once again, the slowest mover of the group — a role it had settled into consistently across nearly every growth-led month in the portfolio's history. With gains showing up across all 13 positions now held, July felt like a genuinely broad-based, healthy month rather than one carried by a single name.", best:{ticker:"NVDA",reason:"Rebounded 8% on strong Q2 datacenter earnings"}, worst:{ticker:"BRK.B",reason:"Steady but the slowest mover in a growth-led month"}, events:["Q2 earnings season broadly beats estimates","NVDA +8% on datacenter demand beat","QQQ crosses $530 for the first time"], change:"+$5,600" },
  { month:"Aug '26", spReturn:"+1.90%", summary:"August continued the steady grind higher that July had established. The Fed signaled a likely September rate cut, which gave growth stocks room to run without the kind of hawkish surprise that had derailed the market back in December 2024. NVDA led the portfolio again, this time on the back of a next-gen AI chip announcement that pushed the stock up roughly 6% on the month — yet another reminder of just how much of the portfolio's overall performance has traced back to NVDA's ups and downs since day one. GOOGL kept building on its post-February-buy strength, pushing past $395 on continued cloud growth. BRK.B lagged again as value continued taking a back seat to growth in what had become a familiar pattern through most of the tracked period.", best:{ticker:"NVDA",reason:"Jumped on next-gen AI chip announcement, up ~6% on the month"}, worst:{ticker:"BRK.B",reason:"Slowest mover as growth outpaced value"}, events:["Fed signals September rate cut","NVDA unveils next-gen AI chip roadmap","GOOGL crosses $395 on cloud growth","S&P +1.90%"], change:"+$4,900" },
];

const EDUCATION_CONTENT = [
  { id:"cagr", title:"CAGR", category:"Returns", icon:"📈", summary:"Compound Annual Growth Rate — the smoothed yearly return rate assuming reinvestment.", detail:"CAGR tells you: 'If my investment grew at a constant rate each year, what would that rate be?' It eliminates the noise of volatile monthly returns and gives a clean apples-to-apples comparison. Formula: (End Value / Start Value)^(1/years) - 1", example:"$100K → $150K over 3 years = CAGR of 14.47% per year", quiz:{q:"An investment doubles in 7 years. What is the approximate CAGR?", options:["7%","10.4%","14.3%","20%"], answer:1} },
  { id:"sharpe", title:"Sharpe Ratio", category:"Risk", icon:"⚖️", summary:"Measures return earned per unit of risk taken. Higher is better.", detail:"The Sharpe Ratio asks: 'Are you being compensated for the risk you're taking?' It divides excess return (above risk-free rate) by volatility. A Sharpe above 1.0 is generally good. Above 2.0 is excellent. Formula: (Portfolio Return - Risk Free Rate) / Standard Deviation", example:"Portfolio return 15%, risk-free 4%, std dev 10% → Sharpe = 1.1", quiz:{q:"Two portfolios both return 12%. Portfolio A has Sharpe of 0.8, Portfolio B has 1.4. Which is better?", options:["Portfolio A — higher absolute return","Portfolio B — better risk-adjusted","They're equal","Can't tell without more info"], answer:1} },
  { id:"beta", title:"Beta", category:"Risk", icon:"β", summary:"Measures how much your portfolio moves relative to the overall market.", detail:"A beta of 1.0 means your portfolio moves in lockstep with the S&P 500. Beta of 1.5 means if S&P drops 10%, you drop ~15%. Beta under 1 means less volatile than market. BRK.B (beta ~0.88) is more defensive. NVDA (beta ~1.74) is more aggressive.", example:"Portfolio beta 1.2 + S&P drops 10% = expect ~12% portfolio drop", quiz:{q:"Your portfolio has a beta of 0.75. The S&P 500 rises 20%. What would you expect?", options:["20% gain","15% gain","25% gain","Can't predict"], answer:1} },
  { id:"alpha", title:"Alpha", category:"Returns", icon:"α", summary:"The return your portfolio generates above what market exposure alone would predict.", detail:"Alpha is the holy grail. It's the 'skill' portion of your returns — what you earned beyond what a passive index fund would have delivered. Positive alpha means your stock picks outperformed. Negative alpha means you'd have done better just buying VOO.", example:"Portfolio +18%, S&P +15% (adjusted for beta) → Alpha = +3%", quiz:{q:"If your portfolio returns 12% and the market returns 12%, what is your alpha (simplified)?", options:["+12%","0%","-12%","Can't calculate"], answer:1} },
  { id:"drawdown", title:"Maximum Drawdown", category:"Risk", icon:"📉", summary:"The largest peak-to-trough decline your portfolio experienced.", detail:"Maximum Drawdown answers: 'What's the worst I would have felt holding this?' It measures the biggest drop from a portfolio's highest point to its lowest before recovering. Your portfolio experienced its worst drawdown during the March 2026 Liberation Day crash.", example:"Portfolio peaks at $140K, drops to $118K → Max Drawdown = -15.7%", quiz:{q:"Portfolio goes $100K → $130K → $105K → $145K. What is max drawdown?", options:["-15%","-19.2%","-28%","-5%"], answer:1} },
  { id:"diversification", title:"Diversification", category:"Strategy", icon:"🎯", summary:"Spreading investments across different assets to reduce risk without sacrificing return.", detail:"Diversification works because different assets don't move in perfect sync. When tech drops, defensive stocks like BRK.B hold up. Your portfolio has some diversification (ETFs + individual stocks) but is heavily concentrated in Technology sector (~65%+). True diversification would include bonds, international stocks, and real estate.", example:"Tech-only portfolio vs. Tech + Finance + Healthcare + Bonds portfolio — same return, much lower risk", quiz:{q:"Which portfolio is best diversified?", options:["10 tech stocks","5 stocks across 5 sectors","VOO + BND + International ETF","2 stocks"], answer:2} },
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

// Renamed internally to Alpaca, kept as fetchFinnhub so every existing call site
// (single lookups + the leaderboard's batched fetcher) needs zero other changes.
async function fetchFinnhub(ticker, fallbackPrice) {
  try {
    const res = await fetch(`https://data.alpaca.markets/v2/stocks/${ticker}/trades/latest`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      },
    });
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    const price = data?.trade?.p;
    if (price && price > 0) return { price, source: "live" };
    throw new Error("no price");
  } catch {
    return { price: fallbackPrice, source: "fallback" };
  }
}

// Alpaca supports fetching many symbols in ONE request, so the leaderboard no
// longer needs to batch-and-wait the way it did for Finnhub — kept as a thin
// wrapper (still named fetchFinnhubBatched) so the leaderboard code is unchanged.
async function fetchFinnhubBatched(tickers, fallbackPrices) {
  const results = {};
  if (tickers.length === 0) return results;
  try {
    const symbols = tickers.join(",");
    const res = await fetch(`https://data.alpaca.markets/v2/stocks/trades/latest?symbols=${symbols}`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      },
    });
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    tickers.forEach(ticker => {
      const price = data?.trades?.[ticker]?.p;
      results[ticker] = (price && price > 0) ? price : fallbackPrices[ticker];
    });
  } catch {
    // Whole batch call failed (network, auth, etc.) — fall back per ticker
    // to what was actually paid, same safety net as before.
    tickers.forEach(ticker => { results[ticker] = fallbackPrices[ticker]; });
  }
  return results;
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

  const monthsOfData = (()=>{ const start=new Date(2023,10,1); const now=new Date(); return (now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth())+1; })();
  const totalDeployed = TRADES.reduce((s,h)=>s+h.allocation,0);
  const totalCurrent = holdings.reduce((s,h)=>s+h.currentValue,0);
  const totalGL = totalCurrent-totalDeployed;
  const totalPct = (totalGL/totalDeployed)*100;
  const anyLive = Object.values(priceStatus).some(s=>s==="live");

  const monthlyVals = P.hasHistory
    ? calcMonthlyPortfolioValues(TRADES)
    : [{month:P.label+" Start", value:totalDeployed, sp500:null}];
  const chartData = P.hasHistory
    ? [...monthlyVals, {month:"Now", value:Math.round(totalCurrent), sp500:MONTHLY_HISTORY[MONTHLY_HISTORY.length-1].sp500}]
    : [...monthlyVals, {month:"Now", value:Math.round(totalCurrent), sp500:null}];

  // Monthly returns for Sharpe (only meaningful once there's real history)
  const monthlyReturns = monthlyVals.slice(1).map((m,i)=>(m.value-monthlyVals[i].value)/monthlyVals[i].value);
  const portfolioBeta = calcBeta(holdings);
  const yearsHeld = Math.max((new Date() - new Date(P.startDate)) / (1000*60*60*24*365.25), 1/365.25);
  const cagr = calcCAGR(totalDeployed, totalCurrent, yearsHeld);
  const sharpe = P.hasHistory && monthlyReturns.length > 1 ? calcSharpe(monthlyReturns) : null;
  const maxDD = P.hasHistory ? calcMaxDrawdown(monthlyVals.map(m=>m.value)) : null;
  const sp500Return = P.hasHistory ? ((MONTHLY_HISTORY[MONTHLY_HISTORY.length-1].sp500 - MONTHLY_HISTORY[0].sp500) / MONTHLY_HISTORY[0].sp500)*100 : null;
  const alpha = P.hasHistory ? totalPct - (sp500Return * portfolioBeta) : null;
  const healthScore = calcHealthScore(holdings);

  // Sector breakdown
  const sectors = {};
  holdings.forEach(h=>{ sectors[h.sector]=(sectors[h.sector]||0)+h.currentValue; });
  const sectorData = Object.entries(sectors).map(([name,val])=>({name, value:Math.round(val), pct:((val/totalCurrent)*100).toFixed(1)})).sort((a,b)=>b.value-a.value);

  // S&P comparison chart
  const sp500Normalized = chartData.map(m=>({month:m.month, portfolio:m.value?Math.round((m.value/totalDeployed)*100):null, sp500:m.sp500?Math.round((m.sp500/MONTHLY_HISTORY[0].sp500)*100):null}));

  const bestH = [...holdings].sort((a,b)=>b.pctChange-a.pctChange)[0];
  const worstH = [...holdings].sort((a,b)=>a.pctChange-b.pctChange)[0];

  // Health score breakdown
  const healthDetails = [
    { label:"Diversification", score:holdings.length>=7?22:15, max:25, note:holdings.length>=7?`Good — ${holdings.length} positions across multiple types`:"Consider adding more positions" },
    { label:"Sector Balance", score:Object.keys(sectors).length>=4?18:10, max:25, note:Object.keys(sectors).length>=4?"Multiple sectors represented":"Heavy Tech concentration — consider rebalancing" },
    { label:"Asset Mix (ETF/Stock)", score:holdings.filter(h=>h.type==="ETF").length>=2?20:12, max:25, note:"Good — ETFs provide broad market exposure" },
    { label:"Risk Level (Beta)", score:portfolioBeta<1.3?20:12, max:25, note:`Portfolio beta ${round2(portfolioBeta)} — ${portfolioBeta<1.2?"moderate risk":"slightly aggressive"}` },
  ];

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
    ["health","Health Score"],["monthly","Monthly"],
    ["education","Learn"],
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
          {Object.keys(PORTFOLIOS).length>1 && (
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
          )}
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
                PortfolioTrack turns your real investment data into institutional-grade analysis — CAGR, Sharpe Ratio, Alpha, Beta, and a live-tracked leaderboard, all in one place.
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>setTab("dashboard")} style={{padding:"12px 28px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  View Dashboard →
                </button>
                <button onClick={()=>setTab("myportfolio")} style={{padding:"12px 28px",borderRadius:10,background:COLORS.card,border:`1px solid ${COLORS.border}`,color:COLORS.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  Create a Personalized Portfolio
                </button>
                <button onClick={()=>setTab("leaderboard")} style={{padding:"12px 28px",borderRadius:10,background:COLORS.card,border:`1px solid ${COLORS.border}`,color:COLORS.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>
                  View Leaderboard
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
                  {icon:"💼",title:"My Portfolio",desc:"Create your own free account, start with $100,000, and build a real portfolio with live-updating prices and gain/loss.",tab:"myportfolio"},
                  {icon:"📅",title:"Monthly Analysis",desc:"Detailed narrative of every month — best performer, worst performer, key market events, and portfolio impact.",tab:"monthly"},
                  {icon:"📚",title:"Education Center",desc:"Learn CAGR, Sharpe Ratio, Beta, Alpha, and Diversification with interactive examples and quizzes.",tab:"education"},
                  {icon:"🏆",title:"Leaderboard",desc:"See how your portfolio stacks up against everyone else who started with the same $100,000.",tab:"leaderboard"},
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
              <div style={{fontSize:11,color:COLORS.dim,marginBottom:16}}>Nov 2023 → Now · Your portfolio vs benchmark</div>
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

            {/* Platform Stats */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginTop:48}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:14}}>Platform Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
                {[
                  {label:"Portfolios Tracked",value:"1",sub:"Jon Ong"},
                  {label:"Positions Monitored",value:String(TRADES.length),sub:`across ${TRADES.length} trades`},
                  {label:"Months of Data",value:String(monthsOfData),sub:"Nov '23 → Now"},
                  {label:"Metrics Calculated",value:"10+",sub:"per portfolio"},
                  {label:"Features Shipped",value:"v2.1",sub:"this session"},
                  {label:"Registered Users",value:communityCount!==null?communityCount.toLocaleString():"—",sub:"worldwide"},
                  {label:"Community Portfolios",value:communityCount!==null?communityCount.toLocaleString():"—",sub:"and counting"},
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
            DASHBOARD
        ══════════════════════════════════════════════════════════════ */}
        {tab==="dashboard" && (
          <div className="fade-in">
            <SectionTitle sub="Real-time portfolio overview with live position data">Portfolio Overview</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:13,marginBottom:24}}>
              <StatCard label="Total Deployed" value={fmt(totalDeployed)} sub={`${TRADES.length} positions`} />
              <StatCard label="Current Value" value={loading?"···":fmt(totalCurrent)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Total Gain" value={loading?"···":(totalGL>=0?"+":"")+fmt(totalGL)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Return %" value={loading?"···":pct(totalPct)} color={totalGL>=0?COLORS.green:COLORS.red} />
              <StatCard label="Best Pick" value={loading?"···":bestH?.ticker} sub={loading?"":pct(bestH?.pctChange??0)} color={COLORS.green} />
              <StatCard label="Worst Pick" value={loading?"···":worstH?.ticker} sub={loading?"":pct(worstH?.pctChange??0)} color={COLORS.red} />
            </div>

            {/* Portfolio value chart */}
            <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"18px 22px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:2}}>Portfolio Value — Nov 2023 to Now</div>
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
                  <span style={{fontWeight:700,color:COLORS.muted,fontSize:12}}>TOTAL · $170K deployed</span>
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

      <AIAssistant contextLine={
        user && myPortfolio
          ? `Logged in as ${myPortfolio.display_name}, community portfolio starting cash $100,000, current cash balance ${fmt(myPortfolio.cash_balance)}.`
          : "This visitor is not logged in / viewing the demo portfolio (started Nov 2023, currently " + pct(totalPct) + " return)."
      } />
    </div>
  );
}

// ─── AI ASSISTANT (Gemini) ──────────────────────────────────────────────────
// Free-tier Gemini call. NOTE: like the existing Finnhub/Alpaca keys in this file,
// VITE_ env vars are bundled into the client JS and are publicly visible in the
// deployed site — fine for a low-volume free-tier demo key, but for anything you
// care about protecting, proxy this through a Supabase Edge Function instead.
const GEMINI_MODEL = "gemini-2.5-flash";
const ASSISTANT_SYSTEM_PROMPT = `You are the built-in assistant for PortfolioTrack, an educational stock-portfolio
tracking app. You help users understand investing concepts (diversification, CAGR, Sharpe ratio, drawdown, etc.),
navigate the app, and interpret their own portfolio numbers when given. Keep answers short (2-5 sentences unless
asked for more), friendly, and beginner-approachable. You are not a licensed financial advisor: never tell someone
what to buy or sell, and add a brief reminder for that kind of question that this is educational, not financial advice.`;

async function askGemini(history, contextLine) {
  if (!GEMINI_KEY) throw new Error("no-key");
  const contents = [
    { role: "user", parts: [{ text: ASSISTANT_SYSTEM_PROMPT + (contextLine ? "\n\nContext about this user: " + contextLine : "") }] },
    { role: "model", parts: [{ text: "Understood — I'll keep that in mind." }] },
    ...history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })),
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 400, temperature: 0.6 } }) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gemini-${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
  if (!text) throw new Error("empty-response");
  return text.trim();
}

function AIAssistant({ contextLine }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next); setInput(""); setErr(""); setSending(true);
    try {
      const reply = await askGemini(next, contextLine);
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch (ex) {
      const msg = ex.message === "no-key"
        ? "The AI assistant isn't configured yet — ask the site owner to set VITE_GEMINI_API_KEY."
        : "Sorry, I couldn't reach the AI assistant just now. Please try again in a moment.";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        style={{
          position: "fixed", bottom: 22, right: 22, width: 54, height: 54, borderRadius: "50%",
          background: COLORS.accent, color: "#fff", border: "none", fontSize: 22, cursor: "pointer",
          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)", zIndex: 1000,
        }}
      >
        {open ? "×" : "💬"}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 22, width: 340, maxWidth: "calc(100vw - 32px)", height: 440,
          maxHeight: "calc(100vh - 140px)", background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 16px 48px -12px rgba(0,0,0,0.6)", zIndex: 1000,
        }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: 13, color: COLORS.text }}>
            🤖 PortfolioTrack Assistant
            <div style={{ fontSize: 10, fontWeight: 400, color: COLORS.dim, marginTop: 2 }}>Educational only — not financial advice</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                Ask me things like "what's a Sharpe ratio?" or "how is my portfolio doing?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? COLORS.accent : COLORS.bg,
                color: m.role === "user" ? "#fff" : COLORS.text,
                border: m.role === "user" ? "none" : `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: "8px 11px", fontSize: 12.5, lineHeight: 1.45, maxWidth: "85%", whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
            ))}
            {sending && <div style={{ fontSize: 12, color: COLORS.muted, alignSelf: "flex-start" }}>Thinking…</div>}
            {err && <div style={{ fontSize: 11, color: COLORS.red, alignSelf: "flex-start" }}>{err}</div>}
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: 6, padding: 10, borderTop: `1px solid ${COLORS.border}` }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question…"
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} style={{ ...btnStyle, padding: "8px 14px", opacity: sending || !input.trim() ? 0.6 : 1 }}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────────
// Supabase caps a single select() at 1,000 rows, so we page through with range()
// until every row is loaded. Ordering by a stable column keeps pages consistent.
async function fetchAllRows(table, orderCol = "id") {
  const PAGE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").order(orderCol).range(from, from + PAGE - 1);
    if (error || !data) return all.length ? all : null;
    all = all.concat(data);
    if (data.length < PAGE) break;
  }
  return all;
}

const LB_PAGE_SIZE = 50;
const LB_TABS = [
  { id: "top10",   label: "Top 10",    limit: 10 },
  { id: "top100",  label: "Top 100",   limit: 100 },
  { id: "top1000", label: "Top 1,000", limit: 1000 },
  { id: "all",     label: "Everyone",  limit: Infinity },
];

function LeaderboardTab() {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [tabId, setTabId] = useState("top10");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function build() {
      setLoadingRows(true);
      const portfolios = await fetchAllRows("portfolios");
      const trades = await fetchAllRows("trades");
      if (!portfolios) { setLoadingRows(false); return; }

      const allTrades = trades || [];
      const quoteCache = {};
      const uniqueTickers = [...new Set(allTrades.map(t => t.ticker))];
      // Group trades by portfolio once (avoids an O(users × trades) scan)
      const byPortfolio = {};
      const byTicker = {};
      allTrades.forEach(t => {
        (byPortfolio[t.portfolio_id] = byPortfolio[t.portfolio_id] || []).push(t);
        // Only buys feed the fallback average-price-paid estimate — a sell's execution
        // price shouldn't pull a ticker's fallback price toward what a seller got.
        if (t.side !== "sell") {
          const b = (byTicker[t.ticker] = byTicker[t.ticker] || { shares: 0, cost: 0 });
          b.shares += t.shares; b.cost += t.shares * t.price;
        }
      });
      // Per-ticker fallback = volume-weighted average price actually paid across all trades,
      // so a failed/rate-limited price call never collapses a holding to $0.
      const fallbackPrices = {};
      uniqueTickers.forEach(ticker => {
        const b = byTicker[ticker];
        fallbackPrices[ticker] = b && b.shares > 0 ? b.cost / b.shares : 0;
      });
      Object.assign(quoteCache, await fetchFinnhubBatched(uniqueTickers, fallbackPrices));

      const ranked = portfolios.map(p => {
        const held = byPortfolio[p.id] || [];
        // Sells subtract shares — summing signed (shares × price) across every trade for a
        // ticker equals net-shares-held × price, so no separate per-ticker netting pass is needed.
        const holdingsValue = held.reduce((s, t) => s + (t.side === "sell" ? -t.shares : t.shares) * (quoteCache[t.ticker] || 0), 0);
        const totalValue = holdingsValue + p.cash_balance;
        const returnPct = ((totalValue - p.starting_cash) / p.starting_cash) * 100;
        return { ...p, totalValue, returnPct };
      }).sort((a, b) => b.returnPct - a.returnPct)
        .map((p, i) => ({ ...p, rank: i + 1 })); // global rank, kept even when searching

      if (!cancelled) { setRows(ranked); setLoadingRows(false); }
    }
    build();
    return () => { cancelled = true; };
  }, []);

  // Only show tabs that add something (e.g. hide "Top 1,000" until there are >100 players)
  const visibleTabs = LB_TABS.filter((t, i) => i === 0 || rows.length > LB_TABS[i - 1].limit);
  const activeTab = visibleTabs.find(t => t.id === tabId) || visibleTabs[0];
  const searching = query.trim().length > 0;

  const listed = useMemo(() => {
    if (searching) {
      const q = query.trim().toLowerCase();
      return rows.filter(r => (r.display_name || "").toLowerCase().includes(q));
    }
    return rows.slice(0, activeTab.limit);
  }, [rows, query, searching, activeTab.limit]);

  const maxAbsReturn = useMemo(() => Math.max(...rows.map(r => Math.abs(r.returnPct)), 1), [rows]);

  if (loadingRows) return <div style={{ color: COLORS.muted, fontSize: 13 }}>Loading leaderboard…</div>;
  if (rows.length === 0) return <div style={{ color: COLORS.muted, fontSize: 13 }}>No community portfolios yet — be the first under "My Portfolio."</div>;

  const totalPages = Math.max(1, Math.ceil(listed.length / LB_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = listed.slice(safePage * LB_PAGE_SIZE, (safePage + 1) * LB_PAGE_SIZE);

  const MEDAL = ["🥇", "🥈", "🥉"];
  const MEDAL_COLOR = ["#facc15", "#cbd5e1", "#d97706"];
  const AVATAR_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#3b82f6"];
  const initials = (name) => (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const pill = (active) => ({
    padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
    background: active ? COLORS.accent : COLORS.card,
    color: active ? "#fff" : COLORS.muted,
  });
  const pagerBtn = (disabled) => ({
    ...pill(false), opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Search + tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 4 }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }}
            placeholder="🔍 Search a username…"
            aria-label="Search leaderboard by username"
            style={{ ...inputStyle, marginTop: 0, paddingRight: 30 }}
          />
          {searching && (
            <button
              onClick={() => { setQuery(""); setPage(0); }}
              aria-label="Clear search"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}
            >×</button>
          )}
        </div>
        {!searching && visibleTabs.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => { setTabId(t.id); setPage(0); }} style={pill(t.id === activeTab.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: COLORS.dim }}>
        {searching
          ? `${listed.length} ${listed.length === 1 ? "match" : "matches"} for "${query.trim()}" · out of ${rows.length.toLocaleString()} players`
          : `Showing ${listed.length.toLocaleString()} of ${rows.length.toLocaleString()} players`}
      </div>

      {listed.length === 0 && (
        <div style={{ color: COLORS.muted, fontSize: 13, padding: "20px 0" }}>No username matches "{query.trim()}".</div>
      )}

      {pageRows.map((r) => {
        const i = r.rank - 1; // global 0-based rank
        const isTop3 = i < 3;
        const barPct = Math.min(100, (Math.abs(r.returnPct) / maxAbsReturn) * 100);
        const isPositive = r.returnPct >= 0;
        return (
          <div
            key={r.id}
            className="lb-row"
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: isTop3 ? "linear-gradient(90deg, #14182c 0%, " + COLORS.card + " 60%)" : COLORS.card,
              border: `1px solid ${isTop3 ? MEDAL_COLOR[i] + "55" : COLORS.border}`,
              borderRadius: 12,
              padding: isTop3 ? "16px 20px" : "13px 20px",
              boxShadow: i === 0 ? "0 0 0 1px rgba(250,204,21,0.15), 0 8px 24px -12px rgba(250,204,21,0.35)" : "none",
              transition: "border-color 0.15s ease, transform 0.15s ease",
            }}
          >
            {/* Rank */}
            <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
              {isTop3 ? (
                <span style={{ fontSize: i === 0 ? 26 : 22 }}>{MEDAL[i]}</span>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.dim }}>#{r.rank.toLocaleString()}</span>
              )}
            </div>

            {/* Avatar */}
            <div style={{
              width: isTop3 ? 40 : 34, height: isTop3 ? 40 : 34, borderRadius: "50%", flexShrink: 0,
              background: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isTop3 ? 14 : 12, fontWeight: 800, color: "#0b1120",
              border: isTop3 ? `2px solid ${MEDAL_COLOR[i]}` : "none",
            }}>
              {initials(r.display_name)}
            </div>

            {/* Name + value */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: isTop3 ? 15 : 14, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.display_name}
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{fmt(r.totalValue)} total value</div>
            </div>

            {/* Return + bar */}
            <div style={{ width: 150, flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: isTop3 ? 18 : 15, color: isPositive ? COLORS.green : COLORS.red, marginBottom: 6 }}>
                {pct(r.returnPct)}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: COLORS.bg, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${barPct}%`, borderRadius: 3,
                  background: isPositive
                    ? `linear-gradient(90deg, ${COLORS.green}99, ${COLORS.green})`
                    : `linear-gradient(90deg, ${COLORS.red}99, ${COLORS.red})`,
                }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6 }}>
          <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} style={pagerBtn(safePage === 0)}>← Prev</button>
          <span style={{ fontSize: 12, color: COLORS.muted }}>Page {safePage + 1} of {totalPages}</span>
          <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} style={pagerBtn(safePage >= totalPages - 1)}>Next →</button>
        </div>
      )}

      <style>{`
        .lb-row:hover { border-color: ${COLORS.borderHover} !important; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ─── DISPLAY NAME HELPERS ───────────────────────────────────────────────────
const NAME_PREFIXES = ["Trend","Bull","Bear","Alpha","Dividend","Value","Growth","Momentum","Index","Yield","Rally","Quant","Compound","Bluechip","Swing","Options","Macro","Vector","Delta","Sigma","Blockchain","Equity","Breakout","Hedge","Ticker","Market","Capital","Margin"];
const NAME_SUFFIXES = ["Trader","Hawk","Wolf","Whale","Sage","Ninja","Pilot","Fox","Baron","Titan","Maven","Guru","Rocket","Falcon","Tiger","Shark","Wizard","Ranger","Captain","Hunter","Oracle","Pioneer"];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Case-insensitive exact match against existing leaderboard names (escapes LIKE wildcards)
async function isNameTaken(name) {
  const escaped = name.trim().replace(/[\\%_]/g, c => "\\" + c);
  const { data, error } = await supabase.from("portfolios").select("id").ilike("display_name", escaped).limit(1);
  if (error) return false; // don't block signup on a lookup failure
  return (data || []).length > 0;
}

// Returns a distinct name like "TrendTrader" — adds digits only if the plain version is taken
async function generateUniqueName() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const base = pick(NAME_PREFIXES) + pick(NAME_SUFFIXES);
    const digits = attempt < 6 ? "" : attempt < 9 ? String(10 + Math.floor(Math.random() * 90)) : String(100 + Math.floor(Math.random() * 9900));
    const candidate = base + digits;
    if (!(await isNameTaken(candidate))) return candidate;
  }
  return "Trader" + Date.now().toString().slice(-7); // practically-unreachable safety net
}

// ─── MY PORTFOLIO (ACCOUNTS) ────────────────────────────────────────────────
const inputStyle = { display: "block", width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, marginTop: 4 };
const btnStyle = { padding: "9px 16px", background: COLORS.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 };

// A single holding with an inline sell form. Kept as its own component so each
// row's open/closed sell state doesn't re-render the whole holdings list.
function HoldingRow({ p, price, isLive, onSell }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const avgCost = p.shares > 0 ? p.costBasis / p.shares : 0;
  const currentValue = (price ?? avgCost) * p.shares;
  const gainLoss = currentValue - p.costBasis;
  const gainLossPct = p.costBasis > 0 ? (gainLoss / p.costBasis) * 100 : 0;
  const sellQty = parseFloat(shares);

  async function submitSell(e) {
    e.preventDefault();
    setErr("");
    if (!sellQty || sellQty <= 0) { setErr("Enter a share amount."); return; }
    if (sellQty > p.shares + 1e-9) { setErr(`You only hold ${p.shares.toFixed(3)} shares.`); return; }
    if (!price) { setErr("Price unavailable — hit Refresh above first."); return; }
    setLoading(true);
    const res = await onSell(p.ticker, sellQty, price);
    setLoading(false);
    if (res?.error) { setErr(res.error); return; }
    setOpen(false); setShares("");
  }

  return (
    <div style={{ borderBottom: `1px solid ${COLORS.bg}`, padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 8 }}>
        <span style={{ fontWeight: 700, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
          {p.ticker}
          {isLive && <span title="Live price" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green, display: "inline-block" }} />}
        </span>
        <span style={{ color: COLORS.muted }}>{p.shares.toFixed(3)} sh {price ? `@ ${fmt(price)}` : ""}</span>
        <span style={{ color: "#94a3b8" }}>{fmt(currentValue)}</span>
        <span style={{ color: gainLoss >= 0 ? COLORS.green : COLORS.red, minWidth: 70, textAlign: "right" }}>
          {price ? pct(gainLossPct) : "—"}
        </span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{ ...btnStyle, padding: "4px 10px", fontSize: 11, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, flexShrink: 0 }}
        >
          {open ? "Cancel" : "Sell"}
        </button>
      </div>

      {open && (
        <form onSubmit={submitSell} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          <input
            type="number" step="any" min="0" max={p.shares} placeholder="Shares to sell" value={shares}
            onChange={e => setShares(e.target.value)}
            style={{ ...inputStyle, marginTop: 0, width: 130 }}
          />
          <button
            type="button"
            onClick={() => setShares(String(p.shares))}
            style={{ ...btnStyle, padding: "6px 10px", fontSize: 11, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
          >
            Sell all
          </button>
          <button type="submit" disabled={loading || !price} style={{ ...btnStyle, padding: "6px 14px", fontSize: 12, opacity: loading || !price ? 0.6 : 1 }}>
            {loading ? "Selling…" : "Confirm sell"}
          </button>
          {!!sellQty && price && (
            <span style={{ fontSize: 11, color: COLORS.dim }}>
              ≈ {fmt(sellQty * price)} proceeds, {(sellQty * price - avgCost * sellQty) >= 0 ? "+" : ""}{fmt(sellQty * price - avgCost * sellQty)} realized
            </span>
          )}
          {err && <div style={{ width: "100%", color: COLORS.red, fontSize: 11 }}>{err}</div>}
        </form>
      )}
    </div>
  );
}

function MyPortfolioTab({ user, myPortfolio, onAuthed, onLogout, onTraded }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
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

  // Aggregate raw trade rows into one position per ticker using average-cost accounting.
  // Trades must be processed in the order they happened (loadHoldings orders by id) since
  // a sell's realized gain/loss depends on the average cost basis *at that point in time*.
  const { positions, realizedTotal } = (() => {
    const acc = {};
    let realizedTotal = 0;
    holdings.forEach(t => {
      if (!acc[t.ticker]) acc[t.ticker] = { ticker: t.ticker, shares: 0, costBasis: 0 };
      const pos = acc[t.ticker];
      if (t.side === "sell") {
        const avgCost = pos.shares > 0 ? pos.costBasis / pos.shares : 0;
        const costRemoved = avgCost * t.shares;
        realizedTotal += t.amount - costRemoved;
        pos.shares -= t.shares;
        pos.costBasis -= costRemoved;
      } else {
        pos.shares += t.shares;
        pos.costBasis += t.amount;
      }
    });
    // Drop fully-closed positions (shares ~0) so they don't show as a $0 row
    return { positions: Object.values(acc).filter(p => p.shares > 1e-6), realizedTotal };
  })();

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
    const { data } = await supabase.from("trades").select("*").eq("portfolio_id", myPortfolio.id).order("id");
    setHoldings(data || []);
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError(""); setAuthLoading(true);
    if (mode === "signup") {
      // Resolve the display name first: reject a taken one, or auto-generate if left blank
      let finalName = displayName.trim();
      if (finalName) {
        if (await isNameTaken(finalName)) { setError(`"${finalName}" is already on the leaderboard — try another or tap 🎲 for a suggestion.`); setAuthLoading(false); return; }
      } else {
        finalName = await generateUniqueName();
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setAuthLoading(false); return; }
      if (data.user) {
        const { error: pErr } = await supabase.from("portfolios").insert({
          user_id: data.user.id, display_name: finalName, starting_cash: 100000, cash_balance: 100000,
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
    const { error: tErr } = await supabase.from("trades").insert({ portfolio_id: myPortfolio.id, ticker: ticker.toUpperCase(), shares, price: quote, amount: dollarAmount, side: "buy" });
    if (tErr) { setTradeError(tErr.message); setTradeLoading(false); return; }
    const { error: bErr } = await supabase.from("portfolios").update({ cash_balance: myPortfolio.cash_balance - dollarAmount }).eq("id", myPortfolio.id);
    setTradeLoading(false);
    if (bErr) { setTradeError(bErr.message); return; }
    setTicker(""); setAmount(""); setQuote(null);
    onTraded(); loadHoldings();
  }

  // Records a sell trade and credits the sale proceeds back to cash. `sharesToSell` and
  // `currentPrice` come from the holding row (validated there); amount = proceeds, matching
  // how "amount" already means the trade's cash value for buys.
  async function handleSell(tickerSym, sharesToSell, currentPrice) {
    const proceeds = sharesToSell * currentPrice;
    const { error: tErr } = await supabase.from("trades").insert({
      portfolio_id: myPortfolio.id, ticker: tickerSym, shares: sharesToSell, price: currentPrice, amount: proceeds, side: "sell",
    });
    if (tErr) return { error: tErr.message };
    const { error: bErr } = await supabase.from("portfolios").update({ cash_balance: myPortfolio.cash_balance + proceeds }).eq("id", myPortfolio.id);
    if (bErr) return { error: bErr.message };
    onTraded(); await loadHoldings();
    return {};
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                <input style={{ ...inputStyle, marginTop: 0 }} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. TrendTrader22" maxLength={30} />
                <button
                  type="button"
                  disabled={suggesting}
                  onClick={async () => { setSuggesting(true); setDisplayName(await generateUniqueName()); setSuggesting(false); }}
                  title="Suggest an available name"
                  style={{ ...btnStyle, padding: "8px 12px", whiteSpace: "nowrap", opacity: suggesting ? 0.6 : 1 }}
                >
                  {suggesting ? "…" : "🎲 Suggest"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 4 }}>Can't think of one? Leave it blank and we'll pick a unique name for you.</div>
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

      {(positions.length > 0 || realizedTotal !== 0) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <StatCard label="Total Portfolio Value" value={fmt(totalValue)} sub={pricesLoading ? "Updating…" : anyLive ? "Live pricing" : "Using last known price"} color={COLORS.text} size="lg" />
          <StatCard label="Total Gain / Loss" value={pct(totalGLPct)} sub={`${totalGL >= 0 ? "+" : ""}${fmt(totalGL)} vs $100,000 start`} color={totalGL >= 0 ? COLORS.green : COLORS.red} size="lg" />
          <StatCard label="Realized Gain / Loss" value={`${realizedTotal >= 0 ? "+" : ""}${fmt(realizedTotal)}`} sub="From closed positions" color={realizedTotal >= 0 ? COLORS.green : COLORS.red} size="lg" />
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
          {positions.map(p => (
            <HoldingRow
              key={p.ticker}
              p={p}
              price={livePrices[p.ticker]}
              isLive={priceStatus[p.ticker] === "live"}
              onSell={handleSell}
            />
          ))}
        </div>
      )}
    </div>
  );
}
