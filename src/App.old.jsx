import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";

const FINNHUB_KEY = "d97g0khr01qub3k96bbgd97g0khr01qub3k96bc0";

const TRADES = [
  { ticker: "VOO",   name: "Vanguard S&P 500 ETF",  buyPrice: 575.20, allocation: 20000, color: "#6366f1", buyDate: "Jun 26, 2025", type: "ETF"   },
  { ticker: "NVDA",  name: "NVIDIA Corp",            buyPrice: 157.50, allocation: 20000, color: "#10b981", buyDate: "Jun 26, 2025", type: "Stock" },
  { ticker: "AAPL",  name: "Apple Inc.",             buyPrice: 200.50, allocation: 15000, color: "#f59e0b", buyDate: "Jun 26, 2025", type: "Stock" },
  { ticker: "MSFT",  name: "Microsoft Corp",         buyPrice: 440.00, allocation: 20000, color: "#3b82f6", buyDate: "Jun 26, 2025", type: "Stock" },
  { ticker: "AMZN",  name: "Amazon.com",             buyPrice: 208.00, allocation: 15000, color: "#ef4444", buyDate: "Jun 26, 2025", type: "Stock" },
  { ticker: "BRK.B", name: "Berkshire Hathaway B",  buyPrice: 463.00, allocation: 10000, color: "#8b5cf6", buyDate: "Jun 26, 2025", type: "Stock" },
  { ticker: "META",  name: "Meta Platforms",         buyPrice: 680.00, allocation: 10000, color: "#ec4899", buyDate: "Oct 1, 2025",  type: "Stock" },
  { ticker: "GOOGL", name: "Alphabet Inc.",          buyPrice: 310.00, allocation: 10000, color: "#14b8a6", buyDate: "Feb 17, 2026", type: "Stock" },
  { ticker: "QQQ",   name: "Invesco Nasdaq-100 ETF", buyPrice: 490.00, allocation: 10000, color: "#f97316", buyDate: "May 1, 2026",  type: "ETF"   },
];

const FALLBACK = {
  VOO: 685.46, NVDA: 195.55, AAPL: 312.66, MSFT: 386.74,
  AMZN: 242.67, "BRK.B": 492.00, META: 600.29, GOOGL: 366.46, QQQ: 533.00,
};

const MONTHLY_HISTORY = [
  { month: "Jun '25", VOO:575.20,NVDA:157.50,AAPL:200.50,MSFT:440.00,AMZN:208.00,"BRK.B":463.00,META:null,GOOGL:null,QQQ:null, note:"Initial purchase. AAPL near 52-wk low." },
  { month: "Jul '25", VOO:587.60,NVDA:161.00,AAPL:211.00,MSFT:466.00,AMZN:218.00,"BRK.B":467.00,META:null,GOOGL:null,QQQ:null, note:"S&P +2.17%. Broad recovery begins." },
  { month: "Aug '25", VOO:598.90,NVDA:170.00,AAPL:222.00,MSFT:490.00,AMZN:224.00,"BRK.B":471.00,META:null,GOOGL:null,QQQ:null, note:"META hits ATH $787. S&P +1.91%." },
  { month: "Sep '25", VOO:619.00,NVDA:176.00,AAPL:230.00,MSFT:512.00,AMZN:229.00,"BRK.B":474.00,META:null,GOOGL:null,QQQ:null, note:"S&P +3.53% — strongest month of 2025." },
  { month: "Oct '25", VOO:633.00,NVDA:186.00,AAPL:240.00,MSFT:535.00,AMZN:242.00,"BRK.B":478.00,META:703.00,GOOGL:null,QQQ:null, note:"META added @ $680. MSFT ATH $538.66." },
  { month: "Nov '25", VOO:634.00,NVDA:189.00,AAPL:255.00,MSFT:510.00,AMZN:248.00,"BRK.B":480.00,META:690.00,GOOGL:null,QQQ:null, note:"Profit taking in tech. S&P +0.13%." },
  { month: "Dec '25", VOO:632.50,NVDA:186.27,AAPL:271.36,MSFT:481.48,AMZN:250.00,"BRK.B":481.00,META:672.00,GOOGL:null,QQQ:null, note:"2025 closes +16.39%. AAPL year-end surge." },
  { month: "Jan '26", VOO:641.00,NVDA:188.62,AAPL:270.51,MSFT:471.00,AMZN:243.00,"BRK.B":481.00,META:660.00,GOOGL:null,QQQ:null, note:"S&P +1.5%. Tariff fears building." },
  { month: "Feb '26", VOO:608.00,NVDA:174.00,AAPL:256.00,MSFT:432.00,AMZN:196.00,"BRK.B":476.00,META:580.00,GOOGL:310.00,QQQ:null, note:"GOOGL added @ $310. Tariff selloff -5%." },
  { month: "Mar '26", VOO:572.00,NVDA:164.98,AAPL:248.00,MSFT:356.00,AMZN:198.00,"BRK.B":471.00,META:530.00,GOOGL:295.00,QQQ:null, note:"Liberation Day shock. S&P -5.75%." },
  { month: "Apr '26", VOO:631.00,NVDA:192.00,AAPL:274.00,MSFT:395.00,AMZN:240.00,"BRK.B":479.00,META:575.00,GOOGL:348.00,QQQ:null, note:"S&P +10.42%! Tariff walkback. S&P crosses 7,000." },
  { month: "May '26", VOO:669.00,NVDA:232.00,AAPL:310.00,MSFT:413.00,AMZN:266.00,"BRK.B":487.00,META:610.00,GOOGL:395.00,QQQ:490.00, note:"QQQ added @ $490. NVDA ATH $235.47." },
  { month: "Jun '26", VOO:678.00,NVDA:207.00,AAPL:302.00,MSFT:392.00,AMZN:248.00,"BRK.B":490.00,META:595.00,GOOGL:372.00,QQQ:516.00, note:"Tech consolidates. AAPL ATH $317 Jun 8." },
];

// Monthly analysis data
const MONTHLY_ANALYSIS = [
  {
    month: "Jun '25",
    spReturn: null,
    summary: "Portfolio launch day. You bought in at an excellent time — AAPL was just 6 days off its 52-week low of $196.86 and NVDA was still recovering from the January DeepSeek AI scare. The broader market was off its highs, giving you a strong entry point.",
    best: { ticker: "MSFT", reason: "Strong starting position ahead of October ATH run" },
    worst: { ticker: "NVDA", reason: "Still depressed from DeepSeek selloff earlier in 2025" },
    events: ["AAPL hit 52-wk low of $196.86 on Jun 20 — you bought 6 days later", "NVDA near its 52-wk low of $157.34", "S&P 500 trading around 5,460"],
    portfolioChange: null,
  },
  {
    month: "Jul '25",
    spReturn: "+2.17%",
    summary: "A strong start to your hold. The S&P gained 2.17% as the market shook off earlier tariff fears. All 6 of your positions moved higher. MSFT began its climb toward what would become an October all-time high. NVDA continued its recovery from the January lows.",
    best: { ticker: "MSFT", reason: "Up ~6% on the month, momentum building toward ATH" },
    worst: { ticker: "BRK.B", reason: "Steady but slow — only up ~0.9% as value stocks lagged growth" },
    events: ["S&P 500 gains 2.17% — broad market recovery", "Fed holds rates steady", "Big Tech earnings beat expectations across the board"],
    portfolioChange: "+$4,200",
  },
  {
    month: "Aug '25",
    spReturn: "+1.91%",
    summary: "Another solid month. META hit an all-time high of $787.42 on August 12 — a stock you'd add to the portfolio just 7 weeks later at a better price. MSFT pushed toward $490, nearing its all-time high territory. AI spending optimism drove the whole tech sector higher.",
    best: { ticker: "MSFT", reason: "Approaching all-time high territory near $490" },
    worst: { ticker: "BRK.B", reason: "Value stocks lag in strong tech-driven months" },
    events: ["META hits ALL-TIME HIGH of $787.42 on Aug 12", "NVDA announces new Blackwell chip deliveries on track", "S&P +1.91% driven by AI and cloud stocks"],
    portfolioChange: "+$3,800",
  },
  {
    month: "Sep '25",
    spReturn: "+3.53%",
    summary: "The strongest month of 2025 for the S&P 500. All your positions surged. MSFT crossed $510 as enterprise AI adoption accelerated. AAPL gained on strong iPhone 17 pre-order momentum. Your portfolio was now meaningfully ahead of your $100K cost basis.",
    best: { ticker: "MSFT", reason: "Surged to $512 on AI cloud spending boom" },
    worst: { ticker: "BRK.B", reason: "Still the slowest mover but steady" },
    events: ["S&P +3.53% — best month of 2025", "NVDA-Intel AI partnership announced", "Apple iPhone 17 pre-orders exceed expectations"],
    portfolioChange: "+$6,100",
  },
  {
    month: "Oct '25",
    spReturn: "+2.27%",
    summary: "The peak month for your original portfolio. MSFT hit its all-time high of $538.66 on October 28. You also added META to the portfolio on October 1 at $680 — buying the pullback after its August ATH. Portfolio value hit its first major peak this month.",
    best: { ticker: "MSFT", reason: "ALL-TIME HIGH of $538.66 on Oct 28 — up 22% from your buy" },
    worst: { ticker: "BRK.B", reason: "Defensive stocks lag in strong bull months" },
    events: ["MSFT hits ALL-TIME HIGH $538.66 on Oct 28", "Trade 2: META added @ $680 on Oct 1", "S&P crosses 6,000 for first time", "S&P +2.27%"],
    portfolioChange: "+$5,800",
  },
  {
    month: "Nov '25",
    spReturn: "+0.13%",
    summary: "The first warning sign. Info Tech had its worst month since March as investors took profits from the October highs. MSFT fell back from $538 ATH. META pulled back slightly. However AAPL showed resilience, continuing its steady climb. The S&P barely moved.",
    best: { ticker: "AAPL", reason: "Resilient during tech profit taking — held gains well" },
    worst: { ticker: "MSFT", reason: "Gave back gains from ATH — down ~$25 from peak" },
    events: ["Info Tech sector worst month since March 2025", "Profit taking after October all-time highs", "S&P +0.13% — nearly flat"],
    portfolioChange: "-$1,200",
  },
  {
    month: "Dec '25",
    spReturn: "-0.05%",
    summary: "A quiet end to 2025. The S&P essentially went nowhere but your portfolio held its gains well. AAPL closed the year at $271.36 — up 35% from your purchase price. NVDA confirmed its 2025 close at $186.27. Overall 2025 was a fantastic year for the S&P, up +16.39%.",
    best: { ticker: "AAPL", reason: "Up 35% from your buy price — best performer in original 6" },
    worst: { ticker: "META", reason: "Down from Oct entry of $680, now at $672" },
    events: ["S&P 500 closes 2025 up +16.39% for the year", "AAPL closes at $271.36 — up 35% from your purchase", "NVDA 2025 close confirmed at $186.27", "Federal Reserve signals slower rate cuts in 2026"],
    portfolioChange: "-$200",
  },
  {
    month: "Jan '26",
    spReturn: "+1.5%",
    summary: "2026 started cautiously optimistic. The S&P gained 1.5% but underneath the surface, tariff concerns were beginning to build. MSFT continued its slide from the October ATH. META kept drifting lower. AAPL held steady near its year-end highs.",
    best: { ticker: "VOO", reason: "Broad market gains carried the ETF higher" },
    worst: { ticker: "MSFT", reason: "Continued slide from ATH — now down ~$67 from peak" },
    events: ["Trump tariff threats escalate on imports", "MSFT continues post-ATH slide", "Fed holds rates — signals caution on inflation"],
    portfolioChange: "+$2,100",
  },
  {
    month: "Feb '26",
    spReturn: "-5.0%",
    summary: "The first real scare. Tariff fears triggered a broad -5% selloff. AMZN hit its 52-week low of $196. META dropped sharply to $580. You made a smart contrarian move — adding GOOGL on February 17 at $310 during the fear. This would prove to be a great entry.",
    best: { ticker: "BRK.B", reason: "Defensive value stock held better than tech in the selloff" },
    worst: { ticker: "AMZN", reason: "Hit 52-week low of $196 — down 5.8% on the month" },
    events: ["S&P -5% on tariff escalation fears", "AMZN hits 52-week low of $196", "Trade 3: GOOGL added @ $310 on Feb 17 — contrarian buy", "META drops to $580 from $680 entry"],
    portfolioChange: "-$7,400",
  },
  {
    month: "Mar '26",
    spReturn: "-5.75%",
    summary: "The darkest month of the entire hold. President Trump's 'Liberation Day' tariff announcement on April 2 was telegraphed all month, causing a -5.75% S&P drop. MSFT hit its 52-week low near $349. Your portfolio briefly dipped close to your cost basis. The key was staying in.",
    best: { ticker: "BRK.B", reason: "Buffett's defensive holdings provided shelter in the storm" },
    worst: { ticker: "MSFT", reason: "Hit 52-week low ~$349 — down 21% from your buy price" },
    events: ["Liberation Day tariff announcement shocks markets", "S&P -5.75% — worst month since 2022", "MSFT hits 52-wk low near $349", "GOOGL briefly below your $310 buy price"],
    portfolioChange: "-$9,800",
  },
  {
    month: "Apr '26",
    spReturn: "+10.42%",
    summary: "One of the greatest single-month recoveries in recent history. The tariff walkback triggered a massive V-shaped rally. S&P gained +10.42% — one of its best months ever. The index crossed 7,000 for the first time on April 15. Your GOOGL position (bought in fear in Feb) surged 12%.",
    best: { ticker: "GOOGL", reason: "Up 18% from your $310 buy — tariff dip buy paying off" },
    worst: { ticker: "META", reason: "Lagged the recovery — still below your $680 entry" },
    events: ["Tariff walkback announced — markets explode higher", "S&P +10.42% — one of best months in decades", "S&P 500 crosses 7,000 for first time on Apr 15", "GOOGL surges from $295 to $348"],
    portfolioChange: "+$18,200",
  },
  {
    month: "May '26",
    spReturn: "+5.0%",
    summary: "AI mania peaked this month. NVDA hit an all-time high of $235.47 on May 14 — up 49% from your purchase price. AAPL nearly hit $315. AMZN hit its ATH of $278.56. You added QQQ on May 1 to ride the momentum. GOOGL hit its ATH of $402.38 on May 13.",
    best: { ticker: "NVDA", reason: "ALL-TIME HIGH $235.47 on May 14 — up 49% from your buy" },
    worst: { ticker: "META", reason: "Recovered to $610 but still below your $680 entry" },
    events: ["NVDA hits ALL-TIME HIGH $235.47 on May 14", "GOOGL hits ALL-TIME HIGH $402.38 on May 13", "AMZN hits ALL-TIME HIGH $278.56 on May 5", "Trade 4: QQQ added @ $490 on May 1", "AAPL near ATH at $315"],
    portfolioChange: "+$14,600",
  },
  {
    month: "Jun '26",
    spReturn: "-1.1%",
    summary: "A mild tech pullback after the May highs. NVDA gave back 12% from its ATH. MSFT remained under pressure from AI cost concerns. However AAPL hit a new all-time high of $317.40 on June 8. The S&P slipped -1.1% but held well above 7,000. QQQ gained 5% in its first full month.",
    best: { ticker: "AAPL", reason: "Hit ALL-TIME HIGH of $317.40 on Jun 8 — up 58% from your buy" },
    worst: { ticker: "NVDA", reason: "Pulled back 12% from May ATH on profit taking" },
    events: ["AAPL hits ALL-TIME HIGH $317.40 on Jun 8", "NVDA -12% from ATH on profit taking", "S&P -1.1% — healthy consolidation", "QQQ up 5% in first full month"],
    portfolioChange: "+$2,800",
  },
];

function currency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function pct(n) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }

async function fetchFinnhub(ticker) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    if (data.c && data.c > 0) return { price: data.c, source: "live" };
    throw new Error("no price");
  } catch {
    return { price: FALLBACK[ticker], source: "fallback" };
  }
}

export default function App() {
  const [prices, setPrices] = useState(FALLBACK);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState("overview");
  const [selectedIdx, setSelectedIdx] = useState(MONTHLY_HISTORY.length - 1);
  const [analysisIdx, setAnalysisIdx] = useState(MONTHLY_ANALYSIS.length - 1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const newPrices = { ...FALLBACK };
    const newStatus = {};
    await Promise.all(TRADES.map(async (t) => {
      const { price, source } = await fetchFinnhub(t.ticker);
      newPrices[t.ticker] = price;
      newStatus[t.ticker] = source;
    }));
    setPrices(newPrices);
    setStatus(newStatus);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const holdings = TRADES.map(h => {
    const currentPrice = prices[h.ticker];
    const shares = h.allocation / h.buyPrice;
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - h.allocation;
    const pctChange = (gainLoss / h.allocation) * 100;
    return { ...h, currentPrice, shares, currentValue, gainLoss, pctChange };
  });

  const totalDeployed = TRADES.reduce((s, h) => s + h.allocation, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalGL = totalCurrent - totalDeployed;
  const totalPct = (totalGL / totalDeployed) * 100;
  const anyLive = Object.values(status).some(s => s === "live");

  const chartData = [
    ...MONTHLY_HISTORY.map(m => {
      let val = 0;
      TRADES.forEach(t => { if (m[t.ticker] !== null) val += (t.allocation / t.buyPrice) * m[t.ticker]; });
      return { month: m.month, value: Math.round(val) };
    }),
    { month: "Now", value: Math.round(totalCurrent) },
  ];

  const monthlyChanges = chartData.slice(1).map((m, i) => ({
    month: m.month,
    change: m.value - chartData[i].value,
  }));

  const selectedM = MONTHLY_HISTORY[selectedIdx];
  const selectedTotal = chartData[selectedIdx];
  const deployedAt = (m) => TRADES.reduce((s, h) => m[h.ticker] !== null ? s + h.allocation : s, 0);
  const analysis = MONTHLY_ANALYSIS[analysisIdx];

  const T = (id) => ({
    padding: "10px 16px", background: "none", border: "none",
    borderBottom: tab === id ? "2px solid #6366f1" : "2px solid transparent",
    color: tab === id ? "#a5b4fc" : "#64748b",
    cursor: "pointer", fontSize: 12, fontWeight: tab === id ? 600 : 400, whiteSpace: "nowrap",
  });

  const bestH = [...holdings].sort((a, b) => b.pctChange - a.pctChange)[0];
  const worstH = [...holdings].sort((a, b) => a.pctChange - b.pctChange)[0];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#070c18", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* HEADER */}
      <div style={{ background: "#0a1020", borderBottom: "1px solid #1a2540", padding: "22px 28px 0" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, paddingBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10,
                  letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20,
                  background: loading ? "#1a2540" : anyLive ? "#0a2a1a" : "#1a2540",
                  color: loading ? "#4b5f8a" : anyLive ? "#34d399" : "#4b5f8a",
                  border: `1px solid ${loading ? "#1a2540" : anyLive ? "#1a3528" : "#1a2540"}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "#4b5f8a" : anyLive ? "#34d399" : "#4b5f8a", animation: loading ? "pulse 1.2s infinite" : "none" }} />
                  {loading ? "Fetching prices…" : anyLive ? "Prices current" : "Prices updated monthly"}
                </div>
                {lastUpdated && !loading && (
                  <span style={{ fontSize: 10, color: "#384a6a" }}>as of {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                )}
                <button onClick={fetchAll} disabled={loading} style={{
                  fontSize: 11, padding: "3px 12px", borderRadius: 20, border: "1px solid #1a2540",
                  background: "#0d1628", color: "#6366f1", cursor: loading ? "default" : "pointer", fontWeight: 600,
                }}>↻ Refresh</button>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>Mock Portfolio Dashboard</h1>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>9 positions · 4 trades · $130,000 deployed · Jun 26, 2025 → Today</div>
              <div style={{ fontSize: 11, color: "#2d3f5e", marginTop: 3, letterSpacing: "0.04em" }}>by Jon Ong</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>Total Portfolio Value</div>
              {loading ? <div style={{ fontSize: 32, color: "#1a2540", background: "#1a2540", borderRadius: 6, width: 200, height: 36, marginLeft: "auto" }} /> : (
                <>
                  <div style={{ fontSize: 34, fontWeight: 900, color: totalGL >= 0 ? "#34d399" : "#f87171", lineHeight: 1 }}>{currency(totalCurrent)}</div>
                  <div style={{ fontSize: 13, color: totalGL >= 0 ? "#34d399" : "#f87171", marginTop: 4 }}>
                    {totalGL >= 0 ? "▲" : "▼"} {currency(Math.abs(totalGL))} · {pct(totalPct)} on $130K
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {[["overview","Overview"],["analysis","Monthly Analysis"],["monthly","Month-by-Month"],["holdings","Holdings"],["trades","Trade Log"]].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} style={T(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Accent gradient bar */}
      <div style={{ height: 2, background: "linear-gradient(90deg, #6366f1, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899, #14b8a6, #f97316)", opacity: 0.6 }} />

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 28px" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 13, marginBottom: 24 }}>
              {[
                { label: "Deployed", val: currency(totalDeployed), sub: "4 trades" },
                { label: "Current Value", val: loading ? "···" : currency(totalCurrent), hi: true },
                { label: "Total Gain", val: loading ? "···" : (totalGL >= 0 ? "+" : "") + currency(totalGL), hi: true },
                { label: "Return %", val: loading ? "···" : pct(totalPct), hi: true },
                { label: "Best Pick", val: loading ? "···" : bestH?.ticker, sub: loading ? "" : pct(bestH?.pctChange ?? 0) },
                { label: "Worst Pick", val: loading ? "···" : worstH?.ticker, sub: loading ? "" : pct(worstH?.pctChange ?? 0) },
              ].map((c, i) => (
                <div key={i} style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 10, padding: "13px 15px" }}>
                  <div style={{ fontSize: 9, color: "#4b5f8a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: c.hi ? (totalGL >= 0 ? "#34d399" : "#f87171") : "#f1f5f9", minHeight: 28 }}>{c.val}</div>
                  {c.sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{c.sub}</div>}
                </div>
              ))}
            </div>
            <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "18px 22px", marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>Portfolio Value — Jun 2025 → Now</div>
              <div style={{ fontSize: 11, color: "#384a6a", marginBottom: 14 }}>Dashed line = $100K original cost basis</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111e35" />
                  <XAxis dataKey="month" tick={{ fill: "#4b5f8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b5f8a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} domain={["auto","auto"]} />
                  <Tooltip contentStyle={{ background: "#070c18", border: "1px solid #1a2540", borderRadius: 8, fontSize: 12 }} formatter={v => [currency(v), "Portfolio"]} labelStyle={{ color: "#94a3b8" }} />
                  <ReferenceLine y={100000} stroke="#1e3a5f" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5}
                    dot={(props) => <circle key={props.index} cx={props.cx} cy={props.cy} r={props.index === chartData.length - 1 ? 6 : 3} fill={props.index === chartData.length - 1 ? "#34d399" : "#6366f1"} stroke={props.index === chartData.length - 1 ? "#0d1628" : "none"} strokeWidth={2} />}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "18px 22px", marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>Monthly Portfolio Change ($)</div>
              <div style={{ fontSize: 11, color: "#384a6a", marginBottom: 14 }}>Green = gained · Red = lost that month</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyChanges}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111e35" />
                  <XAxis dataKey="month" tick={{ fill: "#4b5f8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b5f8a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: "#070c18", border: "1px solid #1a2540", borderRadius: 8, fontSize: 12 }} formatter={v => [(v >= 0 ? "+" : "") + currency(v), "Change"]} labelStyle={{ color: "#94a3b8" }} />
                  <Bar dataKey="change" radius={[3,3,0,0]} fill="#34d399"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 16 }}>All Positions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {holdings.map(h => (
                  <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 175 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: h.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{h.ticker}</span>
                      <span style={{ fontSize: 9, color: "#384a6a" }}>{h.buyDate}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", minWidth: 70 }}>{currency(h.currentPrice)}</div>
                    <div style={{ flex: 1, minWidth: 60 }}>
                      <div style={{ height: 4, background: "#111e35", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.abs(h.pctChange) * 1.5)}%`, background: h.pctChange >= 0 ? h.color : "#f87171", borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 95 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{loading ? "···" : currency(h.currentValue)}</div>
                    </div>
                    <div style={{ minWidth: 80, textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: h.pctChange >= 0 ? "#34d399" : "#f87171" }}>{loading ? "···" : pct(h.pctChange)}</div>
                      <div style={{ fontSize: 10, color: "#384a6a" }}>{loading ? "" : (h.gainLoss >= 0 ? "+" : "") + currency(h.gainLoss)}</div>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #1a2540", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>TOTAL · $130K deployed</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: totalGL >= 0 ? "#34d399" : "#f87171" }}>
                    {loading ? "···" : `${currency(totalCurrent)} · ${pct(totalPct)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ MONTHLY ANALYSIS ══ */}
        {tab === "analysis" && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
              In-depth breakdown of every month — what happened in the market, best and worst performers, key events, and how your portfolio moved.
            </div>

            {/* Month selector */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 24 }}>
              {MONTHLY_ANALYSIS.map((m, i) => (
                <button key={i} onClick={() => setAnalysisIdx(i)} style={{
                  padding: "7px 12px", borderRadius: 7,
                  border: analysisIdx === i ? "1px solid #6366f1" : "1px solid #1a2540",
                  background: analysisIdx === i ? "#191b4a" : "#0d1628",
                  color: analysisIdx === i ? "#a5b4fc" : "#64748b",
                  cursor: "pointer", fontSize: 12, fontWeight: analysisIdx === i ? 700 : 400,
                }}>{m.month}</button>
              ))}
            </div>

            {/* Analysis card */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Header */}
              <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#4b5f8a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Monthly Analysis</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{analysis.month}</div>
                    {analysis.spReturn && (
                      <div style={{ fontSize: 13, color: analysis.spReturn.startsWith("+") ? "#34d399" : "#f87171", marginTop: 4, fontWeight: 600 }}>
                        S&P 500: {analysis.spReturn} that month
                      </div>
                    )}
                  </div>
                  {analysis.portfolioChange && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#4b5f8a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Portfolio Change</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: analysis.portfolioChange.startsWith("+") ? "#34d399" : "#f87171" }}>
                        {analysis.portfolioChange}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>that month</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{analysis.summary}</div>
              </div>

              {/* Best & Worst */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#0d1628", border: "1px solid #1a3528", borderLeft: "3px solid #34d399", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>🏆 Best Performer</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>{analysis.best.ticker}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{analysis.best.reason}</div>
                </div>
                <div style={{ background: "#0d1628", border: "1px solid #3a1e1e", borderLeft: "3px solid #f87171", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>📉 Worst Performer</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>{analysis.worst.ticker}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{analysis.worst.reason}</div>
                </div>
              </div>

              {/* Key Events */}
              <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>📰 Key Events That Month</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {analysis.events.map((event, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 5 }} />
                      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{event}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Position snapshot for that month */}
              <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>Position Snapshot — End of {analysis.month}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a2540" }}>
                        {["Ticker","Price","Value","Return Since Buy"].map(h => (
                          <th key={h} style={{ padding: "7px 4px", textAlign: "left", color: "#384a6a", fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TRADES.map(p => {
                        const mData = MONTHLY_HISTORY[analysisIdx];
                        if (!mData) return null;
                        const price = mData[p.ticker];
                        if (price === null) return (
                          <tr key={p.ticker} style={{ borderBottom: "1px solid #0a1020", opacity: 0.3 }}>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "#64748b" }}>{p.ticker}</td>
                            <td colSpan={3} style={{ padding: "8px 4px", color: "#384a6a", fontStyle: "italic", fontSize: 11 }}>Not yet purchased</td>
                          </tr>
                        );
                        const shares = p.allocation / p.buyPrice;
                        const val = shares * price;
                        const ret = ((price - p.buyPrice) / p.buyPrice) * 100;
                        return (
                          <tr key={p.ticker} style={{ borderBottom: "1px solid #0a1020" }}>
                            <td style={{ padding: "8px 4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                                <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{p.ticker}</span>
                              </div>
                            </td>
                            <td style={{ padding: "8px 4px", color: "#94a3b8" }}>{currency(price)}</td>
                            <td style={{ padding: "8px 4px", fontWeight: 600, color: "#f1f5f9" }}>{currency(val)}</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: ret >= 0 ? "#34d399" : "#f87171" }}>{pct(ret)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ MONTH BY MONTH ══ */}
        {tab === "monthly" && (
          <div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>Select a month to see exact end-of-month values for every position.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
              {MONTHLY_HISTORY.map((m, i) => (
                <button key={i} onClick={() => setSelectedIdx(i)} style={{
                  padding: "7px 12px", borderRadius: 7,
                  border: selectedIdx === i ? "1px solid #6366f1" : "1px solid #1a2540",
                  background: selectedIdx === i ? "#191b4a" : "#0d1628",
                  color: selectedIdx === i ? "#a5b4fc" : "#64748b",
                  cursor: "pointer", fontSize: 12, fontWeight: selectedIdx === i ? 700 : 400,
                }}>{m.month}</button>
              ))}
            </div>
            <div style={{ background: "#0d1628", border: "1px solid #1a2540", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#4b5f8a", textTransform: "uppercase", letterSpacing: "0.1em" }}>Month End Close</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginTop: 3 }}>{selectedM.month}</div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 4, fontStyle: "italic" }}>{selectedM.note}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#475569" }}>Portfolio Value</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#a5b4fc" }}>{currency(selectedTotal?.value ?? 0)}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{currency(deployedAt(selectedM))} deployed</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a2540" }}>
                      {["Ticker","Price","Shares","Value","vs Cost","Return"].map(h => (
                        <th key={h} style={{ padding: "7px 4px", textAlign: "left", color: "#384a6a", fontWeight: 500, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TRADES.map(p => {
                      const price = selectedM[p.ticker];
                      const shares = p.allocation / p.buyPrice;
                      if (price === null) return (
                        <tr key={p.ticker} style={{ borderBottom: "1px solid #0a1020", opacity: 0.3 }}>
                          <td style={{ padding: "8px 4px", fontWeight: 700, color: "#64748b" }}>{p.ticker}</td>
                          <td colSpan={5} style={{ padding: "8px 4px", color: "#384a6a", fontStyle: "italic", fontSize: 11 }}>Not yet purchased — buys {p.buyDate}</td>
                        </tr>
                      );
                      const val = shares * price;
                      const gl = val - p.allocation;
                      const ret = (gl / p.allocation) * 100;
                      return (
                        <tr key={p.ticker} style={{ borderBottom: "1px solid #0a1020" }}>
                          <td style={{ padding: "8px 4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                              <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{p.ticker}</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px 4px", color: "#94a3b8" }}>{currency(price)}</td>
                          <td style={{ padding: "8px 4px", color: "#64748b" }}>{shares.toFixed(3)}</td>
                          <td style={{ padding: "8px 4px", fontWeight: 600, color: "#f1f5f9" }}>{currency(val)}</td>
                          <td style={{ padding: "8px 4px", color: gl >= 0 ? "#34d399" : "#f87171" }}>{(gl >= 0 ? "+" : "") + currency(gl)}</td>
                          <td style={{ padding: "8px 4px", fontWeight: 700, color: ret >= 0 ? "#34d399" : "#f87171" }}>{pct(ret)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ HOLDINGS ══ */}
        {tab === "holdings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {holdings.map(h => (
              <div key={h.ticker} style={{ background: "#0d1628", borderLeft: `3px solid ${h.color}`, border: `1px solid ${h.pctChange >= 0 ? "#1a3528" : "#3a1e1e"}`, borderLeft: `3px solid ${h.color}`, borderRadius: 12, padding: "15px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>{h.ticker}</span>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#111e35", color: "#4b5f8a" }}>{h.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{h.name} · {h.buyDate}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { label: "Invested", val: currency(h.allocation) },
                      { label: "Buy Price", val: currency(h.buyPrice) },
                      { label: "Shares", val: h.shares.toFixed(3) },
                      { label: "Price", val: loading ? "···" : currency(h.currentPrice) },
                      { label: "Value", val: loading ? "···" : currency(h.currentValue) },
                    ].map(item => (
                      <div key={item.label} style={{ minWidth: 80 }}>
                        <div style={{ fontSize: 9, color: "#384a6a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{item.val}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: "right", minWidth: 70 }}>
                      <div style={{ fontSize: 9, color: "#384a6a", textTransform: "uppercase", marginBottom: 2 }}>Return</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: h.pctChange >= 0 ? "#34d399" : "#f87171", lineHeight: 1 }}>{loading ? "···" : pct(h.pctChange)}</div>
                      <div style={{ fontSize: 11, color: h.gainLoss >= 0 ? "#34d399" : "#f87171" }}>{loading ? "" : (h.gainLoss >= 0 ? "+" : "") + currency(h.gainLoss)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ TRADE LOG ══ */}
        {tab === "trades" && (
          <div>
            {[
              { num:1, date:"Jun 26, 2025", capital:"$100,000", color:"#6366f1", tickers:["VOO","NVDA","AAPL","MSFT","AMZN","BRK.B"], rationale:"Initial 6-position portfolio. AAPL 6 days off its 52-wk low. NVDA near bottom after DeepSeek shock. VOO for broad market exposure. BRK.B as defensive anchor." },
              { num:2, date:"Oct 1, 2025",  capital:"$10,000",  color:"#ec4899", tickers:["META"],  rationale:"META hit ATH $787 on Aug 12, then pulled back ~14%. Classic dip-buy on a strong uptrend. AI monetization across Facebook, Instagram & WhatsApp accelerating." },
              { num:3, date:"Feb 17, 2026", capital:"$10,000",  color:"#14b8a6", tickers:["GOOGL"], rationale:"Contrarian buy during tariff selloff. GOOGL down significantly from highs. Google Cloud & Gemini AI fundamentals strong. Bought the fear — up 18%+ since." },
              { num:4, date:"May 1, 2026",  capital:"$10,000",  color:"#f97316", tickers:["QQQ"],   rationale:"April's +10.42% S&P rally confirmed momentum was back. QQQ (Nasdaq-100) gave broad tech exposure to ride the recovery without single-stock risk." },
            ].map(t => {
              const th = holdings.filter(h => t.tickers.includes(h.ticker));
              const cost = th.reduce((s, h) => s + h.allocation, 0);
              const val = th.reduce((s, h) => s + h.currentValue, 0);
              const gl = val - cost;
              const ret = (gl / cost) * 100;
              return (
                <div key={t.num} style={{ background: "#0d1628", border: "1px solid #1a2540", borderLeft: `3px solid ${t.color}`, borderRadius: 12, padding: "18px 22px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>{t.num}</div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Trade {t.num} · {t.date}</span>
                        <span style={{ fontSize: 11, color: t.color }}>{t.capital}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, maxWidth: 500 }}>{t.rationale}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#4b5f8a", textTransform: "uppercase", marginBottom: 2 }}>Trade Return</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: ret >= 0 ? "#34d399" : "#f87171" }}>{loading ? "···" : pct(ret)}</div>
                      <div style={{ fontSize: 12, color: gl >= 0 ? "#34d399" : "#f87171" }}>{loading ? "" : (gl >= 0 ? "+" : "") + currency(gl)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {th.map(h => (
                      <div key={h.ticker} style={{ background: "#070c18", borderRadius: 8, padding: "10px 14px", minWidth: 120 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: h.color }} />
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>{h.ticker}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#475569" }}>@ {currency(h.buyPrice)}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>Now: {loading ? "···" : currency(h.currentPrice)}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: h.pctChange >= 0 ? "#34d399" : "#f87171", marginTop: 4 }}>{loading ? "···" : pct(h.pctChange)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #0f1829", marginTop: 40, padding: "20px 28px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#1e2d45" }}>
            &copy; {new Date().getFullYear()} Jon Ong &middot; Mock Portfolio Dashboard
          </div>
          <div style={{ fontSize: 11, color: "#1e2d45" }}>
            For educational purposes only &middot; Not financial advice
          </div>
        </div>
      </div>
    </div>
  );
}
