import { useState, useEffect } from "react";
import Head from "next/head";

const C = {
  bg0:"#060a0f",bg1:"#0b1017",bg2:"#111820",bg3:"#19232f",bg4:"#1f2d3d",
  border:"#1e3048",borderHi:"#2a4a6a",accent:"#00d4ff",accentDim:"#0099bb",
  green:"#00e676",red:"#ff3d5a",yellow:"#ffd600",orange:"#ff6d00",
  purple:"#a855f7",text:"#e2eaf2",textDim:"#7a9ab8",textMute:"#3a5a7a",
};

const fmt = (n,d=2)=>Number(n).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const rnd = (min,max)=>Math.random()*(max-min)+min;
const rndInt = (min,max)=>Math.floor(rnd(min,max));
function genCandles(base,count,vol){
  const arr=[];let price=base;
  for(let i=0;i<count;i++){
    const change=(Math.random()-0.49)*vol;
    const open=price;price=Math.max(price+change,base*0.5);
    const close=price;
    const high=Math.max(open,close)+Math.random()*vol*0.5;
    const low=Math.min(open,close)-Math.random()*vol*0.5;
    arr.push({open,close,high,low,volume:rnd(100,1000)});
  }
  return arr;
}

function CandleChart({candles,width=700,height=220}){
  const prices=candles.flatMap(c=>[c.high,c.low]);
  const minP=Math.min(...prices)*0.999,maxP=Math.max(...prices)*1.001,range=maxP-minP;
  const padL=60,padR=10,padT=10,padB=30;
  const chartW=width-padL-padR,chartH=height-padT-padB;
  const cw=Math.max(2,chartW/candles.length-1);
  const py=p=>padT+chartH-((p-minP)/range)*chartH;
  const px=i=>padL+i*(chartW/candles.length)+cw/2;
  const ema=(data,period)=>{
    const k=2/(period+1);const out=[];let e=data[0].close;
    data.forEach((c,i)=>{e=i===0?c.close:c.close*k+e*(1-k);out.push(e);});return out;
  };
  const ema20=ema(candles,20),ema50=ema(candles,50);
  const bbPeriod=20;
  const bbs=candles.map((_,i)=>{
    if(i<bbPeriod-1)return null;
    const slice=candles.slice(i-bbPeriod+1,i+1).map(c=>c.close);
    const mean=slice.reduce((a,b)=>a+b,0)/bbPeriod;
    const std=Math.sqrt(slice.reduce((a,b)=>a+(b-mean)**2,0)/bbPeriod);
    return{upper:mean+2*std,lower:mean-2*std};
  });
  let e20="",e50="",bbU="",bbL="";
  ema20.forEach((e,i)=>{e20+=`${i===0?"M":"L"}${px(i)},${py(e)} `;});
  ema50.forEach((e,i)=>{e50+=`${i===0?"M":"L"}${px(i)},${py(e)} `;});
  const firstBB=bbs.findIndex(x=>x);
  bbs.forEach((b,i)=>{if(!b)return;const f=i===firstBB;bbU+=`${f?"M":"L"}${px(i)},${py(b.upper)} `;bbL+=`${f?"M":"L"}${px(i)},${py(b.lower)} `;});
  const yLabels=Array.from({length:5},(_,i)=>minP+(range*i)/4);
  return(
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
      <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.bg2}/><stop offset="100%" stopColor={C.bg1}/></linearGradient></defs>
      <rect width={width} height={height} fill="url(#bg)"/>
      {yLabels.map((y,i)=>(
        <g key={i}><line x1={padL} y1={py(y)} x2={width-padR} y2={py(y)} stroke={C.border} strokeWidth="0.5"/>
        <text x={padL-4} y={py(y)+4} fill={C.textDim} fontSize="9" textAnchor="end">{fmt(y)}</text></g>
      ))}
      {bbU&&<><path d={bbU} fill="none" stroke="#a855f733" strokeWidth="1"/><path d={bbL} fill="none" stroke="#a855f733" strokeWidth="1"/></>}
      <path d={e20} fill="none" stroke={C.yellow} strokeWidth="1" opacity="0.8"/>
      <path d={e50} fill="none" stroke={C.accent} strokeWidth="1" opacity="0.8"/>
      {candles.map((c,i)=>{
        const bull=c.close>=c.open,col=bull?C.green:C.red;
        const bodyTop=py(Math.max(c.open,c.close)),bodyH=Math.max(1,Math.abs(py(c.open)-py(c.close)));
        return(<g key={i}><line x1={px(i)} y1={py(c.high)} x2={px(i)} y2={py(c.low)} stroke={col} strokeWidth="1" opacity="0.7"/>
          <rect x={px(i)-cw/2} y={bodyTop} width={cw} height={bodyH} fill={col} opacity="0.9" rx="0.5"/></g>);
      })}
    </svg>
  );
}
function RSIChart({candles,width=350,height=55}){
  const period=14,rsiVals=[];
  for(let i=period;i<candles.length;i++){
    const slice=candles.slice(i-period,i);
    const gains=[],losses=[];
    slice.forEach((c,j)=>{if(j===0)return;const d=c.close-slice[j-1].close;d>0?gains.push(d):losses.push(-d);});
    const ag=gains.reduce((a,b)=>a+b,0)/period,al=losses.reduce((a,b)=>a+b,0)/period;
    rsiVals.push(al===0?100:100-100/(1+ag/al));
  }
  const padL=40,padR=8,padT=5,padB=12;
  const chartW=width-padL-padR,chartH=height-padT-padB;
  const step=chartW/(rsiVals.length-1);
  const py=v=>padT+chartH-(v/100)*chartH;
  let path="";rsiVals.forEach((v,i)=>{path+=`${i===0?"M":"L"}${padL+i*step},${py(v)} `;});
  return(
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill={C.bg1}/>
      <line x1={padL} y1={py(70)} x2={width-padR} y2={py(70)} stroke={C.red} strokeWidth="0.5" strokeDasharray="3,3"/>
      <line x1={padL} y1={py(30)} x2={width-padR} y2={py(30)} stroke={C.green} strokeWidth="0.5" strokeDasharray="3,3"/>
      <text x={padL-4} y={py(70)+3} fill={C.textDim} fontSize="7" textAnchor="end">70</text>
      <text x={padL-4} y={py(30)+3} fill={C.textDim} fontSize="7" textAnchor="end">30</text>
      <path d={path} fill="none" stroke={C.purple} strokeWidth="1.5"/>
    </svg>
  );
}

function MACDChart({candles,width=350,height=55}){
  const ema=(data,period)=>{const k=2/(period+1);const out=[];let e=data[0];data.forEach((v,i)=>{e=i===0?v:v*k+e*(1-k);out.push(e);});return out;};
  const closes=candles.map(c=>c.close);
  const ema12=ema(closes,12),ema26=ema(closes,26);
  const macdLine=ema12.map((v,i)=>v-ema26[i]);
  const signal=ema(macdLine,9);
  const hist=macdLine.map((v,i)=>v-signal[i]).slice(26);
  const minH=Math.min(...hist),maxH=Math.max(...hist),range=maxH-minH||1;
  const padL=40,padR=8,padT=5,padB=12;
  const chartW=width-padL-padR,chartH=height-padT-padB;
  const barW=Math.max(1,chartW/hist.length-1);
  const py=v=>padT+chartH-((v-minH)/range)*chartH,zero=py(0);
  return(
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill={C.bg1}/>
      <line x1={padL} y1={zero} x2={width-padR} y2={zero} stroke={C.border} strokeWidth="0.5"/>
      {hist.map((v,i)=>(
        <rect key={i} x={padL+i*(chartW/hist.length)} y={v>=0?py(v):zero} width={barW} height={Math.abs(py(v)-zero)} fill={v>=0?C.green:C.red} opacity="0.7"/>
      ))}
    </svg>
  );
}

const ASSETS=["BTC/USDT","ETH/USDT","XAU/USD","EUR/USD","GBP/JPY","NAS100","SOL/USDT","ADA/USDT","AAPL","SPX500"];
const genSignals=()=>ASSETS.map(asset=>{
  const action=Math.random()>0.5?"BUY":"SELL";
  const base=rnd(0.5,50000),entry=base;
  const sl=action==="BUY"?entry*(1-rnd(0.005,0.02)):entry*(1+rnd(0.005,0.02));
  const tp1=action==="BUY"?entry*(1+rnd(0.01,0.03)):entry*(1-rnd(0.01,0.03));
  const tp2=action==="BUY"?entry*(1+rnd(0.03,0.06)):entry*(1-rnd(0.03,0.06));
  const tp3=action==="BUY"?entry*(1+rnd(0.06,0.12)):entry*(1-rnd(0.06,0.12));
  return{asset,action,entry,sl,tp1,tp2,tp3,accuracy:rndInt(72,97),status:["ACTIVE","PENDING","CLOSED"][rndInt(0,3)]};
});

const NEWS=[
  {title:"Fed Signals Possible Rate Cut in Q3 2026",impact:"HIGH",sentiment:"BULLISH",time:"2h ago",icon:"🏦"},
  {title:"US CPI Comes in Below Expectations at 2.3%",impact:"HIGH",sentiment:"BULLISH",time:"4h ago",icon:"📊"},
  {title:"NFP Report: +187K Jobs Added in May",impact:"HIGH",sentiment:"NEUTRAL",time:"6h ago",icon:"💼"},
  {title:"ECB Maintains Rates, EUR Volatility Expected",impact:"MEDIUM",sentiment:"BEARISH",time:"8h ago",icon:"🇪🇺"},
  {title:"Bitcoin ETF Inflows Hit New Monthly Record",impact:"MEDIUM",sentiment:"BULLISH",time:"10h ago",icon:"₿"},
  {title:"China PMI Data Disappoints, Risk-Off Mood",impact:"HIGH",sentiment:"BEARISH",time:"12h ago",icon:"🇨🇳"},
];
export default function TradingPlatform(){
  const [tab,setTab]=useState("dashboard");
  const [signals,setSignals]=useState(()=>genSignals());
  const [candles,setCandles]=useState(()=>genCandles(2350,80,20));
  const [selectedAsset,setSelectedAsset]=useState("XAU/USD");
  const [autoPilot,setAutoPilot]=useState(false);
  const [pauseOnNews,setPauseOnNews]=useState(true);
  const [riskPct,setRiskPct]=useState(1);
  const [balance,setBalance]=useState(10000);
  const [slPips,setSlPips]=useState(50);
  const [brokerTab,setBrokerTab]=useState("mt5");
  const [mt5Connected,setMt5Connected]=useState(false);
  const [cryptoConnected,setCryptoConnected]=useState(false);
  const [analysisText,setAnalysisText]=useState("");
  const [analysisLoading,setAnalysisLoading]=useState(false);
  const [btResult,setBtResult]=useState(null);
  const [btRunning,setBtRunning]=useState(false);
  const [paperBalance,setPaperBalance]=useState(10000);
  const [paperTrades,setPaperTrades]=useState([]);
  const [paperAsset,setPaperAsset]=useState("BTC/USDT");
  const [paperAmt,setPaperAmt]=useState(100);
  const [orders,setOrders]=useState([]);
  const [mt5Form,setMt5Form]=useState({login:"",password:"",server:""});
  const [cryptoForm,setCryptoForm]=useState({exchange:"binance",key:"",secret:""});

  useEffect(()=>{
    const id=setInterval(()=>{
      setCandles(prev=>{
        const last=prev[prev.length-1];
        const change=(Math.random()-0.49)*15;
        const newClose=last.close+change;
        const updated={...last,close:newClose,high:Math.max(last.high,newClose),low:Math.min(last.low,newClose)};
        const arr=[...prev.slice(0,-1),updated];
        if(Math.random()<0.1){arr.push({open:newClose,close:newClose,high:newClose,low:newClose,volume:rnd(100,500)});if(arr.length>100)arr.shift();}
        return arr;
      });
      if(Math.random()<0.05)setSignals(genSignals());
    },1500);
    return()=>clearInterval(id);
  },[]);

  const currentPrice=candles[candles.length-1]?.close||2350;
  const priceChange=currentPrice-candles[0]?.open;
  const pricePct=(priceChange/candles[0]?.open)*100;
  const lotSize=Math.max(0.01,Math.round((balance*(riskPct/100))/(slPips*10)*100)/100);

  const runAnalysis=async()=>{
    setAnalysisLoading(true);setAnalysisText("");
    try{
      const lastCandles=candles.slice(-20).map(c=>`O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`).join(", ");
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({asset:selectedAsset,price:currentPrice.toFixed(2),candles:lastCandles})});
      const data=await res.json();
      setAnalysisText(data.text||data.error||"Analysis unavailable.");
    }catch{setAnalysisText("Analysis service temporarily unavailable.");}
    setAnalysisLoading(false);
  };

  const runBacktest=()=>{
    setBtRunning(true);setBtResult(null);
    setTimeout(()=>{
      const trades=rndInt(80,200),wins=rndInt(Math.floor(trades*0.55),Math.floor(trades*0.80)),losses=trades-wins;
      const totalProfit=rnd(wins*150,wins*400),totalLoss=rnd(losses*100,losses*250);
      setBtResult({trades,wins,losses,winRate:(wins/trades*100).toFixed(1),profitFactor:(totalProfit/totalLoss).toFixed(2),netPnl:totalProfit-totalLoss,maxDD:rnd(5,18).toFixed(1),sharpe:rnd(1.2,3.4).toFixed(2),expectancy:((totalProfit-totalLoss)/trades).toFixed(2)});
      setBtRunning(false);
    },2500);
  };

  const placeOrder=(dir)=>{
    const price=rnd(currentPrice*0.998,currentPrice*1.002);
    setPaperTrades(prev=>[{id:Date.now(),asset:paperAsset,dir,price:price.toFixed(2),amt:paperAmt,time:new Date().toLocaleTimeString()},...prev.slice(0,9)]);
    setPaperBalance(prev=>dir==="BUY"?prev-paperAmt:prev+paperAmt*0.998);
  };

  const execAutoPilot=(sig)=>{
    const order={id:Date.now(),asset:sig.asset,dir:sig.action,entry:sig.entry.toFixed(4),time:new Date().toLocaleTimeString(),status:"FILLED"};
    setOrders(prev=>[order,...prev.slice(0,19)]);
  };
  const s={
    app:{background:C.bg0,color:C.text,fontFamily:"'IBM Plex Mono','Courier New',monospace",minHeight:"100vh",fontSize:"13px"},
    header:{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"center",gap:"16px",height:"52px",position:"sticky",top:0,zIndex:100,flexWrap:"wrap"},
    logo:{color:C.accent,fontWeight:700,fontSize:"15px",letterSpacing:"2px",display:"flex",alignItems:"center",gap:"8px",whiteSpace:"nowrap"},
    nav:{display:"flex",gap:"2px",flex:1,flexWrap:"wrap"},
    navBtn:(a)=>({padding:"6px 12px",borderRadius:"4px",border:"none",cursor:"pointer",fontSize:"10px",letterSpacing:"1px",fontFamily:"inherit",fontWeight:600,background:a?C.bg4:"transparent",color:a?C.accent:C.textDim}),
    pill:(c)=>({background:c+"22",border:`1px solid ${c}44`,color:c,padding:"3px 10px",borderRadius:"20px",fontSize:"10px",letterSpacing:"1px",fontWeight:700}),
    panel:{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",marginBottom:"12px"},
    panelHd:{fontSize:"10px",letterSpacing:"2px",color:C.textDim,fontWeight:700,marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},
    card:{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"12px"},
    input:{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:"4px",padding:"8px 12px",color:C.text,fontFamily:"inherit",fontSize:"12px",width:"100%",outline:"none"},
    btn:(c=C.accent)=>({background:c+"22",border:`1px solid ${c}66`,color:c,padding:"8px 18px",borderRadius:"4px",cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:700,letterSpacing:"1px"}),
    btnSolid:(c=C.accent)=>({background:c,border:`1px solid ${c}`,color:C.bg0,padding:"8px 18px",borderRadius:"4px",cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:700,letterSpacing:"1px",width:"100%",marginTop:"8px"}),
    tag:(c)=>({background:c+"22",color:c,padding:"2px 8px",borderRadius:"3px",fontSize:"10px",fontWeight:700,letterSpacing:"1px",display:"inline-block"}),
    grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:"12px"},
    toggleWrap:{position:"relative",width:"50px",height:"25px",cursor:"pointer",flexShrink:0},
    toggleTrack:(on)=>({position:"absolute",inset:0,borderRadius:"13px",background:on?C.accent:C.bg4,border:`1px solid ${on?C.accent:C.border}`,transition:"all .3s"}),
    toggleThumb:(on)=>({position:"absolute",top:"3px",left:on?"27px":"3px",width:"17px",height:"17px",borderRadius:"50%",background:on?C.bg0:C.textDim,transition:"all .3s"}),
    table:{width:"100%",borderCollapse:"collapse",display:"block",overflowX:"auto"},
    th:{textAlign:"left",padding:"8px 10px",fontSize:"9px",letterSpacing:"1.5px",color:C.textMute,borderBottom:`1px solid ${C.border}`,fontWeight:700,whiteSpace:"nowrap"},
    td:{padding:"9px 10px",borderBottom:`1px solid ${C.border}22`,fontSize:"11px",whiteSpace:"nowrap"},
    mainContent:{padding:"14px 16px",maxWidth:"1400px",margin:"0 auto"},
  };

  const tabs=[{id:"dashboard",label:"DASHBOARD"},{id:"signals",label:"SIGNALS"},{id:"broker",label:"BROKER"},{id:"risk",label:"RISK"},{id:"news",label:"NEWS"},{id:"backtest",label:"BACKTEST"}];

  return(
    <>
      <Head>
        <title>NEXUS AI — Trading Platform</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      </Head>
      <div style={s.app}>
        <style>{`*{box-sizing:border-box} input::placeholder{color:${C.textMute}} select option{background:${C.bg2}}`}</style>
        <div style={s.header}>
          <div style={s.logo}>
            <svg width="18" height="18" viewBox="0 0 20 20"><polygon points="10,1 19,5 19,15 10,19 1,15 1,5" fill="none" stroke={C.accent} strokeWidth="1.5"/><polygon points="10,5 15,8 15,12 10,15 5,12 5,8" fill={C.accent} opacity="0.3"/></svg>
            NEXUS<span style={{color:C.textDim}}>AI</span>
          </div>
          <nav style={s.nav}>
            {tabs.map(t=><button key={t.id} style={s.navBtn(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
          </nav>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:autoPilot?C.green:C.textMute,boxShadow:autoPilot?`0 0 8px ${C.green}`:"none"}}/>
              <span style={{fontSize:"10px",color:autoPilot?C.green:C.textDim}}>{autoPilot?"AUTO ON":"STANDBY"}</span>
            </div>
            <span style={s.pill(pricePct>=0?C.green:C.red)}>{pricePct>=0?"▲":"▼"} {Math.abs(pricePct).toFixed(2)}%</span>
            <span style={{color:C.accent,fontWeight:700}}>{fmt(currentPrice)}</span>
          </div>
        </div>
        <div style={s.mainContent}>
          {tab==="dashboard"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"10px",marginBottom:"12px"}}>
                {[{label:"PORTFOLIO",val:`$${fmt(balance+12480)}`,color:C.text},{label:"DAILY P&L",val:"+$1,284",color:C.green},{label:"WIN RATE",val:"78.4%",color:C.accent},{label:"OPEN TRADES",val:orders.length.toString(),color:C.yellow},{label:"RISK",val:`${riskPct}%`,color:C.orange}].map((m,i)=>(
                  <div key={i} style={{...s.card,textAlign:"center"}}>
                    <div style={{fontSize:"20px",fontWeight:700,color:m.color}}>{m.val}</div>
                    <div style={{fontSize:"9px",color:C.textDim,letterSpacing:"1px",marginTop:"2px"}}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={s.grid2}>
                <div style={s.panel}>
                  <div style={s.panelHd}><span>📈</span> LIVE CHART
                    <select style={{...s.input,width:"130px",marginLeft:"auto"}} value={selectedAsset} onChange={e=>setSelectedAsset(e.target.value)}>
                      {ASSETS.map(a=><option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <CandleChart candles={candles} width={700} height={210}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginTop:"6px"}}>
                    <div><div style={{...s.panelHd,marginBottom:"2px",fontSize:"9px"}}>RSI (14)</div><RSIChart candles={candles} width={350} height={52}/></div>
                    <div><div style={{...s.panelHd,marginBottom:"2px",fontSize:"9px"}}>MACD</div><MACDChart candles={candles} width={350} height={52}/></div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  <div style={s.panel}>
                    <div style={s.panelHd}><span>🤖</span> AI MARKET ANALYST</div>
                    {analysisText?<div style={{color:C.textDim,lineHeight:"1.7",fontSize:"11.5px"}}>{analysisText}</div>:<div style={{color:C.textMute,fontSize:"11px",lineHeight:"1.6"}}>اضغط Analyze للحصول على تحليل AI</div>}
                    <button style={s.btnSolid(C.accent)} onClick={runAnalysis} disabled={analysisLoading}>{analysisLoading?"⏳ ANALYZING...":"⚡ ANALYZE MARKET"}</button>
                  </div>
                  <div style={s.panel}>
                    <div style={s.panelHd}><span>🛸</span> AUTO-PILOT</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div><div style={{fontWeight:700,color:autoPilot?C.green:C.textDim}}>{autoPilot?"ACTIVE":"STANDBY"}</div><div style={{fontSize:"10px",color:C.textMute,marginTop:"2px"}}>Full AI trade execution</div></div>
                      <div style={s.toggleWrap} onClick={()=>setAutoPilot(p=>!p)}><div style={s.toggleTrack(autoPilot)}/><div style={s.toggleThumb(autoPilot)}/></div>
                    </div>
                  </div>
                  <div style={{...s.panel,flex:1}}>
                    <div style={s.panelHd}><span>📋</span> ORDERS ({orders.length})</div>
                    {orders.length===0?<div style={{color:C.textMute,fontSize:"11px"}}>No orders yet.</div>:orders.slice(0,6).map(o=>(
                      <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}22`,fontSize:"11px"}}>
                        <span style={s.tag(o.dir==="BUY"?C.green:C.red)}>{o.dir}</span>
                        <span style={{color:C.textDim}}>{o.asset}</span>
                        <span style={{color:C.accent}}>{o.entry}</span>
                        <span style={s.tag(C.green)}>FILLED</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab==="signals"&&(
            <div style={s.panel}>
              <div style={s.panelHd}><span>⚡</span> AI SIGNALS — {signals.length} ACTIVE<span style={{marginLeft:"auto",...s.pill(C.green)}}>LIVE</span></div>
              <table style={s.table}>
                <thead><tr>{["ASSET","ACTION","ENTRY","TP1","TP2","TP3","SL","ACCURACY","STATUS","EXEC"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{signals.map((sig,i)=>(
                  <tr key={i}>
                    <td style={s.td}><strong>{sig.asset}</strong></td>
                    <td style={s.td}><span style={s.tag(sig.action==="BUY"?C.green:C.red)}>{sig.action}</span></td>
                    <td style={s.td}>{fmt(sig.entry,4)}</td>
                    <td style={{...s.td,color:C.green}}>{fmt(sig.tp1,4)}</td>
                    <td style={{...s.td,color:C.green}}>{fmt(sig.tp2,4)}</td>
                    <td style={{...s.td,color:C.green}}>{fmt(sig.tp3,4)}</td>
                    <td style={{...s.td,color:C.red}}>{fmt(sig.sl,4)}</td>
                    <td style={s.td}><div style={{display:"flex",alignItems:"center",gap:"5px"}}><div style={{width:"50px",height:"4px",background:C.bg4,borderRadius:"2px"}}><div style={{width:`${sig.accuracy}%`,height:"100%",background:sig.accuracy>85?C.green:C.yellow,borderRadius:"2px"}}/></div><span style={{color:sig.accuracy>85?C.green:C.yellow,fontWeight:700}}>{sig.accuracy}%</span></div></td>
                    <td style={s.td}><span style={s.tag(sig.status==="ACTIVE"?C.green:sig.status==="PENDING"?C.yellow:C.textMute)}>{sig.status}</span></td>
                    <td style={s.td}><button style={{...s.btn(sig.action==="BUY"?C.green:C.red),padding:"4px 10px",fontSize:"10px"}} onClick={()=>execAutoPilot(sig)}>{autoPilot?"AUTO":"EXEC"}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {tab==="broker"&&(
            <div style={s.grid2}>
              <div style={s.panel}>
                <div style={s.panelHd}><span>🔗</span> BROKER INTEGRATION</div>
                <div style={{display:"flex",gap:"4px",marginBottom:"16px"}}>
                  {["mt5","crypto"].map(t=><button key={t} style={s.navBtn(brokerTab===t)} onClick={()=>setBrokerTab(t)}>{t==="mt5"?"METATRADER 5":"CRYPTO"}</button>)}
                </div>
                {brokerTab==="mt5"?(
                  <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                    {[["LOGIN","text","123456789","login"],["PASSWORD","password","••••••••","password"],["SERVER","text","ICMarkets-Live02","server"]].map(([l,t,p,k])=>(
                      <div key={k}><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>{l}</div><input style={s.input} type={t} placeholder={p} value={mt5Form[k]} onChange={e=>setMt5Form(p=>({...p,[k]:e.target.value}))}/></div>
                    ))}
                    <button style={s.btnSolid(mt5Connected?C.red:C.green)} onClick={()=>setMt5Connected(p=>!p)}>{mt5Connected?"⛔ DISCONNECT":"⚡ CONNECT MT5"}</button>
                    {mt5Connected&&<div style={{...s.pill(C.green),textAlign:"center",padding:"8px"}}>● CONNECTED</div>}
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                    <div><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>EXCHANGE</div>
                    <select style={s.input} value={cryptoForm.exchange} onChange={e=>setCryptoForm(p=>({...p,exchange:e.target.value}))}>{["binance","bybit","okx","kraken","coinbase","kucoin"].map(e=><option key={e}>{e}</option>)}</select></div>
                    {[["API KEY","text","sk-live-xxxx","key"],["SECRET","password","••••••••","secret"]].map(([l,t,p,k])=>(
                      <div key={k}><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>{l}</div><input style={s.input} type={t} placeholder={p} value={cryptoForm[k]} onChange={e=>setCryptoForm(p=>({...p,[k]:e.target.value}))}/></div>
                    ))}
                    <button style={s.btnSolid(cryptoConnected?C.red:C.purple)} onClick={()=>setCryptoConnected(p=>!p)}>{cryptoConnected?"⛔ DISCONNECT":`⚡ CONNECT ${cryptoForm.exchange.toUpperCase()}`}</button>
                    {cryptoConnected&&<div style={{...s.pill(C.purple),textAlign:"center",padding:"8px"}}>● CONNECTED</div>}
                  </div>
                )}
              </div>
              <div style={s.panel}>
                <div style={s.panelHd}><span>📊</span> ACCOUNT</div>
                {(mt5Connected||cryptoConnected)?[["Balance",`$${fmt(balance)}`,C.text],["Equity",`$${fmt(balance*1.032)}`,C.green],["Margin Used",`$${fmt(balance*0.12)}`,C.yellow],["Free Margin",`$${fmt(balance*0.88)}`,C.accent],["Margin Level","856%",C.green],["Leverage","1:500",C.textDim]].map(([l,v,c],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${C.border}22`,paddingBottom:"8px",marginBottom:"8px"}}>
                    <span style={{color:C.textDim}}>{l}</span><strong style={{color:c}}>{v}</strong>
                  </div>
                )):<div style={{color:C.textMute,textAlign:"center",padding:"40px 0"}}>Connect a broker first</div>}
              </div>
            </div>
          )}
          {tab==="risk"&&(
            <div style={s.grid2}>
              <div style={s.panel}>
                <div style={s.panelHd}><span>🛡️</span> RISK MANAGEMENT</div>
                <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{fontSize:"11px",color:C.textDim}}>RISK PER TRADE</span><span style={{color:riskPct>2?C.red:C.green,fontWeight:700}}>{riskPct}%</span></div>
                    <input type="range" min="0.1" max="5" step="0.1" value={riskPct} onChange={e=>setRiskPct(parseFloat(e.target.value))} style={{width:"100%"}}/>
                  </div>
                  {[["BALANCE ($)",balance,setBalance],["SL PIPS",slPips,setSlPips]].map(([l,v,set])=>(
                    <div key={l}><div style={{fontSize:"11px",color:C.textDim,marginBottom:"6px"}}>{l}</div><input style={s.input} type="number" value={v} onChange={e=>set(Number(e.target.value))}/></div>
                  ))}
                  <div style={{background:C.bg3,border:`1px solid ${C.accent}44`,borderRadius:"6px",padding:"16px",textAlign:"center"}}>
                    <div style={{fontSize:"10px",letterSpacing:"2px",color:C.textDim,marginBottom:"6px"}}>LOT SIZE</div>
                    <div style={{fontSize:"36px",fontWeight:700,color:C.accent}}>{lotSize}</div>
                    <div style={{fontSize:"10px",color:C.textMute,marginTop:"4px"}}>Risk: ${fmt(balance*riskPct/100)}</div>
                  </div>
                </div>
              </div>
              <div style={s.panel}>
                <div style={s.panelHd}><span>📉</span> RISK SCORE</div>
                <div style={{textAlign:"center",padding:"20px"}}>
                  <div style={{fontSize:"48px",fontWeight:700,color:riskPct<1?C.green:riskPct<2?C.yellow:C.red}}>{riskPct<1?"LOW":riskPct<2?"MED":"HIGH"}</div>
                  <div style={{marginTop:"12px",height:"6px",background:C.bg4,borderRadius:"3px"}}>
                    <div style={{width:`${Math.min(100,riskPct/5*100)}%`,height:"100%",background:riskPct<1?C.green:riskPct<2?C.yellow:C.red,borderRadius:"3px",transition:"all .3s"}}/>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab==="news"&&(
            <div style={s.grid2}>
              <div style={s.panel}>
                <div style={s.panelHd}><span>📰</span> NEWS ENGINE<span style={{marginLeft:"auto",...s.pill(C.accent)}}>LIVE</span></div>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {NEWS.map((n,i)=>(
                    <div key={i} style={{...s.card,display:"flex",gap:"12px"}}>
                      <div style={{fontSize:"22px"}}>{n.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,marginBottom:"6px",fontSize:"12px"}}>{n.title}</div>
                        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                          <span style={s.tag(n.impact==="HIGH"?C.red:C.yellow)}>{n.impact}</span>
                          <span style={s.tag(n.sentiment==="BULLISH"?C.green:n.sentiment==="BEARISH"?C.red:C.yellow)}>{n.sentiment}</span>
                          <span style={{color:C.textMute,fontSize:"10px"}}>{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                <div style={s.panel}>
                  <div style={s.panelHd}><span>🌡️</span> VOLATILITY</div>
                  {[["USD Index",72,C.red],["EUR/USD",45,C.yellow],["BTC F&G",68,C.green],["Sentiment",55,C.yellow]].map(([l,v,c],i)=>(
                    <div key={i} style={{marginBottom:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"11px"}}><span style={{color:C.textDim}}>{l}</span><span style={{color:c,fontWeight:700}}>{v}/100</span></div>
                      <div style={{height:"5px",background:C.bg4,borderRadius:"3px"}}><div style={{width:`${v}%`,height:"100%",background:c,borderRadius:"3px"}}/></div>
                    </div>
                  ))}
                </div>
                <div style={s.panel}>
                  <div style={s.panelHd}><span>🛑</span> NEWS FAILSAFE</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                    <div><div style={{fontWeight:700,color:pauseOnNews?C.yellow:C.textDim}}>PAUSE ON HIGH IMPACT</div></div>
                    <div style={s.toggleWrap} onClick={()=>setPauseOnNews(p=>!p)}><div style={s.toggleTrack(pauseOnNews)}/><div style={s.toggleThumb(pauseOnNews)}/></div>
                  </div>
                  <div style={{padding:"10px",background:C.yellow+"11",border:`1px solid ${C.yellow}33`,borderRadius:"4px",fontSize:"10px",color:C.yellow}}>⚡ Next: FOMC — Today 19:00 UTC</div>
                </div>
              </div>
            </div>
          )}
          {tab==="backtest"&&(
            <div style={s.grid2}>
              <div>
                <div style={s.panel}>
                  <div style={s.panelHd}><span>⏳</span> BACKTESTING</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                    {[{label:"Strategy",opts:["AI Signal","EMA Cross","RSI Reversal","BB Breakout"]},{label:"Asset",opts:ASSETS},{label:"Timeframe",opts:["M15","H1","H4","D1"]},{label:"Range",opts:["3 Months","6 Months","1 Year","2 Years"]}].map((f,i)=>(
                      <div key={i}><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>{f.label}</div><select style={s.input}>{f.opts.map(o=><option key={o}>{o}</option>)}</select></div>
                    ))}
                    <button style={s.btnSolid(C.purple)} onClick={runBacktest} disabled={btRunning}>{btRunning?"⏳ RUNNING...":"▶ RUN BACKTEST"}</button>
                  </div>
                </div>
                {btResult&&(
                  <div style={s.panel}>
                    <div style={s.panelHd}><span>📊</span> RESULTS</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                      {[["WIN RATE",`${btResult.winRate}%`,parseFloat(btResult.winRate)>60?C.green:C.yellow],["PROFIT FACTOR",btResult.profitFactor,parseFloat(btResult.profitFactor)>1.5?C.green:C.yellow],["NET P&L",`$${fmt(btResult.netPnl)}`,btResult.netPnl>0?C.green:C.red],["DRAWDOWN",`${btResult.maxDD}%`,parseFloat(btResult.maxDD)<10?C.green:C.red],["SHARPE",btResult.sharpe,C.accent],["TRADES",btResult.trades,C.text]].map(([l,v,c],i)=>(
                        <div key={i} style={{...s.card,textAlign:"center"}}><div style={{fontSize:"18px",fontWeight:700,color:c}}>{v}</div><div style={{fontSize:"9px",color:C.textDim,marginTop:"2px"}}>{l}</div></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={s.panel}>
                <div style={s.panelHd}><span>📝</span> PAPER TRADING</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}}>
                  <div style={{...s.card,textAlign:"center"}}><div style={{fontSize:"18px",fontWeight:700,color:C.green}}>${fmt(paperBalance)}</div><div style={{fontSize:"9px",color:C.textDim}}>BALANCE</div></div>
                  <div style={{...s.card,textAlign:"center"}}><div style={{fontSize:"18px",fontWeight:700,color:C.accent}}>{paperTrades.length}</div><div style={{fontSize:"9px",color:C.textDim}}>TRADES</div></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px"}}>
                  <div><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>ASSET</div><select style={s.input} value={paperAsset} onChange={e=>setPaperAsset(e.target.value)}>{ASSETS.map(a=><option key={a}>{a}</option>)}</select></div>
                  <div><div style={{fontSize:"10px",color:C.textDim,marginBottom:"4px"}}>AMOUNT ($)</div><input style={s.input} type="number" value={paperAmt} onChange={e=>setPaperAmt(Number(e.target.value))}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                    <button style={{...s.btn(C.green),width:"100%"}} onClick={()=>placeOrder("BUY")}>▲ BUY</button>
                    <button style={{...s.btn(C.red),width:"100%"}} onClick={()=>placeOrder("SELL")}>▼ SELL</button>
                  </div>
                </div>
                {paperTrades.map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}22`,fontSize:"11px"}}>
                    <span style={s.tag(t.dir==="BUY"?C.green:C.red)}>{t.dir}</span>
                    <span style={{color:C.textDim}}>{t.asset}</span>
                    <span style={{color:C.accent}}>${t.price}</span>
                    <span style={{color:C.textMute}}>{t.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
