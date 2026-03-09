// ═══════════════════════════════════════════════════════════════
//  AAUSHADE — Full App with "Add to Database" Feature
//  File: src/App.jsx
//
//  ENV VARIABLES needed in .env:
//  REACT_APP_PLANTID_KEY=your_plantid_key
//  REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
//  REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ── Plant.id ─────────────────────────────────────────────────
async function identifyPlant(base64Image) {
  const res = await fetch("https://api.plant.id/v2/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": process.env.REACT_APP_PLANTID_KEY },
    body: JSON.stringify({
      images: [base64Image],
      modifiers: ["crops_fast", "similar_images"],
      plant_details: ["common_names", "url", "wiki_description", "taxonomy"],
    }),
  });
  const data = await res.json();
  const top = data.suggestions?.[0];
  return {
    name: top?.plant_name ?? "Unknown Plant",
    confidence: Math.round((top?.probability ?? 0) * 100),
    commonNames: top?.plant_details?.common_names ?? [],
    description: top?.plant_details?.wiki_description?.value ?? "",
    taxonomy: top?.plant_details?.taxonomy ?? {},
  };
}

// ── Claude API — generate Ayurvedic plant data ───────────────
async function generateAyurvedicData(plantName, commonNames, wikiDescription) {
  const prompt = `You are an expert Ayurvedic botanist. Generate comprehensive Ayurvedic data for the plant: "${plantName}" (also known as: ${commonNames.join(", ")}).

Background: ${wikiDescription?.slice(0, 300) || "A plant identified via image recognition."}

Respond ONLY with a valid JSON object — no markdown, no extra text — using exactly this structure:
{
  "name_en": "Common English name",
  "name_hi": "Hindi name in Devanagari script",
  "name_gu": "Gujarati name in Gujarati script",
  "latin_name": "Scientific binomial name",
  "emoji": "single most relevant emoji",
  "dosha": "affected doshas e.g. Vata · Pitta",
  "season": "best season e.g. Year-round or Monsoon peak",
  "rarity": "Common or Moderate or Rare",
  "tags": ["tag1","tag2","tag3"],
  "description_en": "2-3 sentence Ayurvedic description in English",
  "description_hi": "2-3 sentence description in Hindi",
  "description_gu": "2-3 sentence description in Gujarati",
  "benefits": ["benefit 1","benefit 2","benefit 3","benefit 4"],
  "uses": ["Preparation method 1","Preparation method 2","Preparation method 3"],
  "pros": ["pro 1","pro 2","pro 3"],
  "cons": ["caution 1","caution 2","caution 3"],
  "region": "Geographic region where found e.g. Pan-India or Gujarat"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.map((c) => c.text || "").join("") || "{}";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Helpers ──────────────────────────────────────────────────
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const getAnonId = () => {
  let id = localStorage.getItem("anonId");
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("anonId", id); }
  return "anon-" + id;
};

// ── Design tokens ─────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');`;
const C = { bg:"#1c1510", surface:"#231a14", warm:"#f0e8dc", muted:"#9a8878", accent:"#c8956c", border:"rgba(200,149,108,0.15)" };
const ACCENT_MAP = ["#c8956c","#7aaf85","#a78bce","#e8a87c","#6aa8c8","#c87a7a"];

const LANGS = {
  en: {
    appName:"Aaushade", nav:["Discover","Scan","Saved","History"],
    search:"Search plants, benefits...", nearbyTitle:"Nearby Plants",
    nearbyCount:(n)=>`${n} plants within 2 km`,
    scanTitle:"Identify a Plant", scanSubtitle:"Upload a photo or use your camera",
    gallery:"Gallery", camera:"Camera", scanBtn:"Identify Plant",
    scanning:"Analyzing plant...", generating:"Generating Ayurvedic profile...",
    scanMatch:"species matched", confidence:"confidence",
    benefits:"Benefits", uses:"Uses", proscons:"Pros & Cons",
    pros:"Benefits", cons:"Cautions", dosha:"Dosha", season:"Season", distance:"Distance",
    savedTitle:"Saved Plants", savedEmpty:"No saved plants yet. Tap ♡ on any plant!",
    historyTitle:"Scan History", historyEmpty:"No scans yet. Try the Scan tab!",
    saveBtn:"Save", savedBtn:"Saved ✓", backBtn:"← Back",
    matchFound:"Found in Database ✓", noMatch:"New Plant Identified",
    viewDetails:"View Ayurvedic Details",
    addToDb:"+ Add to Database",
    addToDbTitle:"Add to Aaushade Database",
    addToDbSubtitle:"Claude AI has generated this plant's Ayurvedic profile. Review and confirm to save it permanently.",
    confirmAdd:"Confirm & Save to Database",
    cancelAdd:"Cancel",
    saving:"Saving to database...",
    savedToDb:"Added to Database!",
    generateError:"Failed to generate data. Check connection.",
  },
  hi: {
    appName:"औषधे", nav:["खोजें","स्कैन","सहेजे","इतिहास"],
    search:"पौधे खोजें...", nearbyTitle:"नजदीकी पौधे",
    nearbyCount:(n)=>`${n} पौधे 2 किमी में`,
    scanTitle:"पौधे की पहचान", scanSubtitle:"फोटो अपलोड करें या कैमरा उपयोग करें",
    gallery:"गैलरी", camera:"कैमरा", scanBtn:"पहचानें",
    scanning:"विश्लेषण...", generating:"आयुर्वेदिक प्रोफ़ाइल बना रहे हैं...",
    scanMatch:"प्रजातियां", confidence:"सटीकता",
    benefits:"लाभ", uses:"उपयोग", proscons:"फायदे व नुकसान",
    pros:"फायदे", cons:"सावधानियां", dosha:"दोष", season:"मौसम", distance:"दूरी",
    savedTitle:"सहेजे पौधे", savedEmpty:"कोई पौधा सहेजा नहीं।",
    historyTitle:"स्कैन इतिहास", historyEmpty:"अभी तक कोई स्कैन नहीं।",
    saveBtn:"सहेजें", savedBtn:"सहेजा ✓", backBtn:"← वापस",
    matchFound:"डेटाबेस में मिला ✓", noMatch:"नया पौधा पहचाना",
    viewDetails:"विवरण देखें",
    addToDb:"+ डेटाबेस में जोड़ें",
    addToDbTitle:"डेटाबेस में जोड़ें",
    addToDbSubtitle:"AI ने प्रोफ़ाइल बनाई है। जांचें और सहेजें।",
    confirmAdd:"डेटाबेस में सहेजें",
    cancelAdd:"रद्द करें",
    saving:"सहेज रहे हैं...",
    savedToDb:"डेटाबेस में जोड़ा गया!",
    generateError:"डेटा उत्पन्न करने में विफल।",
  },
  gu: {
    appName:"ઔષધે", nav:["શોધો","સ્કૅન","સાચવેલ","ઇતિહાસ"],
    search:"છોડ શોધો...", nearbyTitle:"નજીકના છોડ",
    nearbyCount:(n)=>`${n} છોડ 2 કિમીમાં`,
    scanTitle:"છોડ ઓળખો", scanSubtitle:"ફોટો અપલોડ કરો અથવા કૅમેરા વાપરો",
    gallery:"ગૅલેરી", camera:"કૅમેરા", scanBtn:"ઓળખો",
    scanning:"વિશ્લેષણ...", generating:"આયુર્વેદ પ્રોફાઇલ બનાવીએ છીએ...",
    scanMatch:"પ્રજાતિ", confidence:"ચોકસાઈ",
    benefits:"ફાયદા", uses:"ઉપયોગ", proscons:"ફાયદા/ગેરફાયદા",
    pros:"ફાયદા", cons:"સાવચેતી", dosha:"દોષ", season:"ઋતુ", distance:"અંતર",
    savedTitle:"સાચવેલ છોડ", savedEmpty:"કોઈ સાચવ્યું નથી.",
    historyTitle:"સ્કૅન ઇતિહાસ", historyEmpty:"હજી સ્કૅન નથી.",
    saveBtn:"સાચવો", savedBtn:"સચવાયું ✓", backBtn:"← પાછા",
    matchFound:"ડેટાબેઝમાં મળ્યો ✓", noMatch:"નવો છોડ ઓળખાયો",
    viewDetails:"વિગત જુઓ",
    addToDb:"+ ડેટાબેઝમાં ઉમેરો",
    addToDbTitle:"ડેટાબેઝમાં ઉમેરો",
    addToDbSubtitle:"AI પ્રોફાઇલ બનાવી. સમીક્ષા કરો અને સાચવો.",
    confirmAdd:"ડેટાબેઝમાં સાચવો",
    cancelAdd:"રદ કરો",
    saving:"સાચવી રહ્યા છીએ...",
    savedToDb:"ડેટાબેઝમાં ઉમેરાયું!",
    generateError:"ડેટા બનાવવામાં નિષ્ફળ.",
  },
};

// ── Tiny shared components ────────────────────────────────────
function Tag({ label, accent = C.accent }) {
  return (
    <span style={{ fontSize:10, padding:"3px 10px", borderRadius:20, background:`${accent}18`, color:accent, border:`1px solid ${accent}40`, fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}
function Spinner({ size = 40, color = C.accent }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, animation:"spin 0.9s linear infinite", margin:"0 auto" }} />;
}
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 24px" }}>
      <div style={{ fontSize:48, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:14, color:C.muted, lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

// ── Editable field components ─────────────────────────────────
function EditableField({ label, value, onChange, multiline = false }) {
  const shared = { width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 12px", color:C.warm, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none" };
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:5 }}>{label}</div>
      {multiline
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{ ...shared, resize:"vertical", lineHeight:1.6 }} />
        : <input value={value} onChange={e=>onChange(e.target.value)} style={shared} />
      }
    </div>
  );
}
function EditableList({ label, items, onChange, accent = C.accent }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{label}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:7 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:accent, flexShrink:0 }} />
          <input value={item} onChange={e=>{ const n=[...items]; n[i]=e.target.value; onChange(n); }}
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:9, padding:"8px 11px", color:C.warm, fontSize:12, fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
          <button onClick={()=>onChange(items.filter((_,j)=>j!==i))}
            style={{ background:"rgba(232,128,128,0.1)", border:"1px solid rgba(232,128,128,0.2)", borderRadius:7, width:26, height:26, color:"#e88080", cursor:"pointer", fontSize:14, flexShrink:0 }}>×</button>
        </div>
      ))}
      <button onClick={()=>onChange([...items,""])}
        style={{ background:`${accent}12`, border:`1px dashed ${accent}44`, borderRadius:9, padding:"6px 14px", color:accent, cursor:"pointer", fontSize:11, width:"100%" }}>
        + Add item
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADD-TO-DATABASE PANEL
// ═══════════════════════════════════════════════════════════════
function AddToDbPanel({ scanResult, onClose, onSaved, lang }) {
  const L = LANGS[lang];
  const [genState, setGenState] = useState("generating"); // generating|ready|saving|saved|error
  const [draft, setDraft] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const GREEN = "#7aaf85";

  const generate = useCallback(async () => {
    setGenState("generating");
    try {
      const data = await generateAyurvedicData(scanResult.name, scanResult.commonNames, scanResult.description);
      setDraft(data);
      setGenState("ready");
    } catch (err) {
      console.error(err);
      setGenState("error");
    }
  }, [scanResult]);

  useEffect(() => { generate(); }, [generate]);

  const update = (field, val) => setDraft(d => ({ ...d, [field]: val }));

  const saveToDatabase = async () => {
    setGenState("saving");
    try {
      const { data, error } = await supabase.from("plants").insert({
        name_en: draft.name_en, name_hi: draft.name_hi, name_gu: draft.name_gu,
        latin_name: draft.latin_name, emoji: draft.emoji || "🌿",
        dosha: draft.dosha, season: draft.season, rarity: draft.rarity,
        tags: draft.tags, region: draft.region,
        description: JSON.stringify({ en: draft.description_en, hi: draft.description_hi, gu: draft.description_gu }),
        benefits: draft.benefits, uses: draft.uses, pros: draft.pros, cons: draft.cons,
      }).select().single();
      if (error) throw error;
      setGenState("saved");
      setTimeout(() => onSaved(data), 1600);
    } catch (err) {
      console.error(err);
      setGenState("error");
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(10,8,6,0.93)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", maxWidth:440, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>

      {/* Header */}
      <div style={{ padding:"16px 18px 12px", borderBottom:`1px solid ${C.border}`, background:C.bg, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:C.warm }}>{L.addToDbTitle}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:8, width:28, height:28, color:C.muted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ fontSize:11, color:C.muted, lineHeight:1.6, marginBottom:10 }}>{L.addToDbSubtitle}</div>
        {/* Plant badge */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background:`${GREEN}10`, border:`1px solid ${GREEN}30`, borderRadius:10, padding:"8px 12px" }}>
          <span style={{ fontSize:20 }}>{draft?.emoji || "🌿"}</span>
          <div>
            <div style={{ fontSize:13, color:C.warm, fontWeight:600 }}>{scanResult.name}</div>
            <div style={{ fontSize:10, color:GREEN }}>{scanResult.confidence}% confidence via Plant.id</div>
          </div>
        </div>
      </div>

      {/* Generating */}
      {genState === "generating" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:36, textAlign:"center" }}>
          <Spinner size={52} color={GREEN} />
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.warm }}>{L.generating}</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8, maxWidth:280 }}>
            Claude AI is researching Ayurvedic texts, generating multilingual names, benefits, doshas, and preparation methods...
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
            {["Consulting Ayurvedic texts...","Generating Hindi & Gujarati names...","Compiling benefits & uses..."].map((s,i)=>(
              <div key={i} style={{ fontSize:11, color:`${GREEN}88`, animation:`pulse 1.6s ease ${i*0.45}s infinite` }}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {genState === "error" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:48 }}>⚠️</div>
          <div style={{ fontSize:14, color:C.warm }}>{L.generateError}</div>
          <button onClick={generate} style={{ background:`${GREEN}22`, border:`1px solid ${GREEN}`, color:GREEN, borderRadius:10, padding:"9px 22px", cursor:"pointer", fontSize:13 }}>Retry</button>
        </div>
      )}

      {/* Saving */}
      {genState === "saving" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:40 }}>
          <Spinner size={50} color={GREEN} />
          <div style={{ fontSize:15, color:C.warm }}>{L.saving}</div>
        </div>
      )}

      {/* Saved */}
      {genState === "saved" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:64, animation:"float 2s ease infinite" }}>✅</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.warm, marginBottom:4 }}>{L.savedToDb}</div>
          <div style={{ fontSize:13, color:GREEN }}>{draft?.name_en} is now part of Aaushade</div>
          <div style={{ fontSize:11, color:C.muted }}>It will appear in Discover & Encyclopedia</div>
        </div>
      )}

      {/* Review form */}
      {genState === "ready" && draft && (
        <>
          {/* Tab bar */}
          <div style={{ padding:"10px 16px 0", background:C.bg, flexShrink:0 }}>
            <div style={{ display:"flex", gap:4 }}>
              {[["basic","🌿 Basic"],["content","📋 Content"],["multilingual","🌐 Languages"]].map(([t,lbl])=>(
                <button key={t} onClick={()=>setActiveTab(t)} style={{ flex:1, padding:"7px 3px", borderRadius:9, fontSize:10, fontWeight:600, background:activeTab===t?`${GREEN}22`:C.surface, border:`1px solid ${activeTab===t?GREEN:C.border}`, color:activeTab===t?GREEN:C.muted, cursor:"pointer", transition:"all 0.15s" }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Form body */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>

            {activeTab === "basic" && (
              <>
                <div style={{ background:`${GREEN}08`, border:`1px solid ${GREEN}22`, borderRadius:11, padding:"10px 13px", marginBottom:14, fontSize:11, color:GREEN, lineHeight:1.7 }}>
                  All fields are pre-filled by Claude AI. Edit anything before saving.
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}><EditableField label="English Name" value={draft.name_en||""} onChange={v=>update("name_en",v)} /></div>
                  <div style={{ width:64 }}><EditableField label="Emoji" value={draft.emoji||"🌿"} onChange={v=>update("emoji",v)} /></div>
                </div>
                <EditableField label="Latin / Scientific Name" value={draft.latin_name||""} onChange={v=>update("latin_name",v)} />
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}><EditableField label="Dosha" value={draft.dosha||""} onChange={v=>update("dosha",v)} /></div>
                  <div style={{ flex:1 }}><EditableField label="Season" value={draft.season||""} onChange={v=>update("season",v)} /></div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1 }}><EditableField label="Rarity" value={draft.rarity||""} onChange={v=>update("rarity",v)} /></div>
                  <div style={{ flex:1 }}><EditableField label="Region" value={draft.region||""} onChange={v=>update("region",v)} /></div>
                </div>
                {/* Tags */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:7 }}>Tags</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                    {(draft.tags||[]).map((t,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:4, background:`${GREEN}12`, border:`1px solid ${GREEN}30`, borderRadius:20, padding:"3px 10px" }}>
                        <span style={{ fontSize:11, color:GREEN }}>{t}</span>
                        <button onClick={()=>update("tags",(draft.tags||[]).filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:`${GREEN}88`, cursor:"pointer", fontSize:12, padding:0 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <input placeholder="Type a tag and press Enter..."
                    onKeyDown={e=>{ if(e.key==="Enter"&&e.target.value.trim()){ update("tags",[...(draft.tags||[]),e.target.value.trim()]); e.target.value=""; }}}
                    style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px dashed ${GREEN}44`, borderRadius:9, padding:"7px 11px", color:C.warm, fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif" }}
                  />
                </div>
              </>
            )}

            {activeTab === "content" && (
              <>
                <EditableField label="Ayurvedic Description (English)" value={draft.description_en||""} onChange={v=>update("description_en",v)} multiline />
                <EditableList label="Benefits" items={draft.benefits||[]} onChange={v=>update("benefits",v)} accent={GREEN} />
                <EditableList label="Uses / Preparation Methods" items={draft.uses||[]} onChange={v=>update("uses",v)} accent={C.accent} />
                <EditableList label="Pros" items={draft.pros||[]} onChange={v=>update("pros",v)} accent={GREEN} />
                <EditableList label="Cons / Cautions" items={draft.cons||[]} onChange={v=>update("cons",v)} accent="#e88080" />
              </>
            )}

            {activeTab === "multilingual" && (
              <>
                <div style={{ background:`${GREEN}08`, border:`1px solid ${GREEN}22`, borderRadius:11, padding:"10px 13px", marginBottom:14, fontSize:11, color:GREEN, lineHeight:1.7 }}>
                  Please verify the Hindi and Gujarati scripts carefully before saving.
                </div>
                <EditableField label="Hindi Name (हिंदी)" value={draft.name_hi||""} onChange={v=>update("name_hi",v)} />
                <EditableField label="Description in Hindi" value={draft.description_hi||""} onChange={v=>update("description_hi",v)} multiline />
                <div style={{ height:1, background:C.border, margin:"14px 0" }} />
                <EditableField label="Gujarati Name (ગુજરાતી)" value={draft.name_gu||""} onChange={v=>update("name_gu",v)} />
                <EditableField label="Description in Gujarati" value={draft.description_gu||""} onChange={v=>update("description_gu",v)} multiline />
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div style={{ padding:"12px 18px 20px", borderTop:`1px solid ${C.border}`, background:C.bg, flexShrink:0, display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:12, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:13 }}>
              {L.cancelAdd}
            </button>
            <button onClick={saveToDatabase} style={{ flex:2, padding:"11px", borderRadius:12, background:`linear-gradient(135deg,${GREEN},#4a9e60)`, border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, boxShadow:`0 6px 18px ${GREEN}44` }}>
              {L.confirmAdd}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function Aaushade() {
  const [lang, setLang] = useState("en");
  const [tab, setTab] = useState("discover");
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [section, setSection] = useState("benefits");
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedPlants, setSavedPlants] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [scanState, setScanState] = useState("idle");
  const [scanResult, setScanResult] = useState(null);
  const [scanMode, setScanMode] = useState("gallery");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [navVisible, setNavVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const fileRef = useRef();
  const videoRef = useRef();
  const contentRef = useRef();
  const L = LANGS[lang];

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setUserLocation({ lat:p.coords.latitude, lng:p.coords.longitude }),
      () => setUserLocation({ lat:23.2156, lng:72.6369 })
    );
  }, []);

  const loadPlants = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("plants").select("*");
    if (data) setPlants(data);
    setLoading(false);
  }, []);
  useEffect(() => { loadPlants(); }, [loadPlants]);

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser();
      const uid = user?.id ?? getAnonId();
      const { data } = await supabase.from("saved_plants").select("plant_id, plants(*)").eq("user_id", uid);
      if (data) { setSavedIds(new Set(data.map(r=>r.plant_id))); setSavedPlants(data.map(r=>r.plants)); }
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser();
      const uid = user?.id ?? getAnonId();
      const { data } = await supabase.from("scan_history").select("*").eq("user_id", uid).order("scanned_at",{ascending:false}).limit(20);
      if (data) setScanHistory(data);
    }
    load();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const h = () => { const c=el.scrollTop; setNavVisible(c<lastScroll||c<40); setLastScroll(c); };
    el.addEventListener("scroll", h);
    return () => el.removeEventListener("scroll", h);
  }, [lastScroll]);

  const toggleSave = useCallback(async (plant) => {
    const { data:{ user } } = await supabase.auth.getUser();
    const uid = user?.id ?? getAnonId();
    if (savedIds.has(plant.id)) {
      await supabase.from("saved_plants").delete().match({ user_id:uid, plant_id:plant.id });
      setSavedIds(p=>{ const s=new Set(p); s.delete(plant.id); return s; });
      setSavedPlants(p=>p.filter(x=>x.id!==plant.id));
    } else {
      await supabase.from("saved_plants").insert({ user_id:uid, plant_id:plant.id });
      setSavedIds(p=>new Set([...p,plant.id]));
      setSavedPlants(p=>[...p,plant]);
    }
  }, [savedIds]);

  const processScanImage = useCallback(async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setScanState("scanning"); setScanResult(null);
    try {
      const b64 = await toBase64(file);
      const result = await identifyPlant(b64);
      const { data: dbMatch } = await supabase.from("plants").select("*").ilike("name_en",`%${result.name.split(" ")[0]}%`).limit(1).single();
      const { data:{ user } } = await supabase.auth.getUser();
      const uid = user?.id ?? getAnonId();
      await supabase.from("scan_history").insert({ user_id:uid, plant_id:dbMatch?.id??null, identified_name:result.name, confidence:result.confidence/100, latitude:userLocation?.lat, longitude:userLocation?.lng, location_name:"Gandhinagar, Gujarat" });
      const { data:hist } = await supabase.from("scan_history").select("*").eq("user_id",uid).order("scanned_at",{ascending:false}).limit(20);
      if (hist) setScanHistory(hist);
      setScanResult({ ...result, dbMatch });
      setScanState("result");
    } catch (err) { console.error(err); setScanState("error"); }
  }, [userLocation]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { alert("Camera access denied."); }
  }, []);

  const captureFromCamera = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    c.toBlob(blob=>processScanImage(blob),"image/jpeg",0.9);
    v.srcObject?.getTracks().forEach(t=>t.stop());
  }, [processScanImage]);

  useEffect(() => {
    if (tab === "scan" && scanMode === "camera") startCamera();
    return () => {
      const video = videoRef.current;
      video?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, [tab, scanMode, startCamera]);

  const getName = p => p[`name_${lang}`] || p.name_en || "";
  const getDesc = p => { try { const d=typeof p.description==="string"?JSON.parse(p.description):p.description; return d?.[lang]||d?.en||""; } catch { return ""; } };
  const getVideos = p => { try { return typeof p.videos==="string"?JSON.parse(p.videos):(p.videos??[]); } catch { return []; } };
  const filtered = plants.filter(p=>(p.name_en??"").toLowerCase().includes(query.toLowerCase())||(p.tags??[]).some(t=>t.toLowerCase().includes(query.toLowerCase())));

  return (
    <>
      <style>{`
        ${FONTS}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#c8956c44;border-radius:4px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:1}}
        input::placeholder,textarea::placeholder{color:#7a6858;}
      `}</style>

      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.bg, height:"100vh", display:"flex", flexDirection:"column", maxWidth:440, margin:"0 auto", overflow:"hidden", position:"relative" }}>

        {/* ── Add-to-DB overlay ── */}
        {showAddPanel && scanResult && (
          <AddToDbPanel
            scanResult={scanResult} lang={lang}
            onClose={() => setShowAddPanel(false)}
            onSaved={newPlant => {
              setPlants(p => [...p, newPlant]);
              setShowAddPanel(false);
              setScanResult(r => ({ ...r, dbMatch: newPlant }));
            }}
          />
        )}

        {/* ── NAV ── */}
        <nav style={{ zIndex:20, background:`${C.bg}f0`, backdropFilter:"blur(18px)", borderBottom:`1px solid ${C.border}`, padding:"12px 18px 8px", transition:"transform 0.3s,opacity 0.3s", transform:navVisible?"translateY(0)":"translateY(-100%)", opacity:navVisible?1:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.accent},#a06840)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:`0 4px 12px ${C.accent}55` }}>🌿</div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:800,color:C.warm,lineHeight:1 }}>{L.appName}</div>
                <div style={{ fontSize:8,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase" }}>Ayurvedic Plant Guide</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:3 }}>
              {["en","hi","gu"].map(l=>(
                <button key={l} onClick={()=>setLang(l)} style={{ padding:"3px 8px",borderRadius:7,background:lang===l?`${C.accent}28`:"transparent",border:`1px solid ${lang===l?C.accent:C.border}`,color:lang===l?C.accent:C.muted,cursor:"pointer",fontSize:10,fontWeight:600,transition:"all 0.15s" }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",gap:4,overflowX:"auto" }}>
            {[{id:"discover",icon:"🗺️",label:L.nav[0]},{id:"scan",icon:"📷",label:L.nav[1]},{id:"saved",icon:"♡",label:L.nav[2]},{id:"history",icon:"🕐",label:L.nav[3]}].map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setSelectedPlant(null);setScanState("idle");setPreviewUrl(null);}} style={{ padding:"5px 12px",borderRadius:18,whiteSpace:"nowrap",background:tab===t.id?`${C.accent}22`:"transparent",border:`1px solid ${tab===t.id?C.accent:"transparent"}`,color:tab===t.id?C.accent:C.muted,cursor:"pointer",fontSize:11,fontWeight:tab===t.id?600:400,display:"flex",alignItems:"center",gap:4 }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── SCROLLABLE CONTENT ── */}
        <div ref={contentRef} style={{ flex:1, overflowY:"auto", scrollBehavior:"smooth" }}>

          {/* DISCOVER */}
          {tab==="discover"&&!selectedPlant&&(
            <div style={{ padding:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 14px",marginBottom:18 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke={C.accent} strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/></svg>
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={L.search} style={{ background:"none",border:"none",outline:"none",color:C.warm,fontSize:13,width:"100%" }} />
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,color:C.warm }}>{L.nearbyTitle}</div>
                <div style={{ fontSize:11,color:C.muted }}>{L.nearbyCount(filtered.length)}</div>
              </div>
              {loading ? <div style={{ padding:40,textAlign:"center" }}><Spinner/></div> : (
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {filtered.map((p,i)=>(
                    <PlantCard key={p.id} plant={p} getName={getName} accent={ACCENT_MAP[i%ACCENT_MAP.length]}
                      isSaved={savedIds.has(p.id)} onSave={()=>toggleSave(p)}
                      onClick={()=>{setSelectedPlant(p);setSection("benefits");}} delay={i*0.07}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DETAIL */}
          {tab==="discover"&&selectedPlant&&(()=>{
            const ac=ACCENT_MAP[plants.indexOf(selectedPlant)%ACCENT_MAP.length]||C.accent;
            return (
              <div style={{ animation:"fadeUp 0.3s ease" }}>
                <div style={{ padding:"18px 18px 0",background:`linear-gradient(180deg,${ac}20,transparent)` }}>
                  <button onClick={()=>setSelectedPlant(null)} style={{ background:`${ac}18`,border:`1px solid ${ac}30`,color:ac,borderRadius:9,padding:"5px 13px",cursor:"pointer",fontSize:12,marginBottom:16 }}>{L.backBtn}</button>
                  <div style={{ fontSize:40,marginBottom:8,animation:"float 4s ease infinite" }}>{selectedPlant.emoji||"🌿"}</div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:26,color:C.warm,marginBottom:3 }}>{getName(selectedPlant)}</h2>
                  <div style={{ fontSize:12,color:C.muted,fontStyle:"italic",marginBottom:10 }}>{selectedPlant.latin_name}</div>
                  <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>{(selectedPlant.tags??[]).map(t=><Tag key={t} label={t} accent={ac}/>)}</div>
                  <p style={{ fontSize:13,color:"#c4b8a8",lineHeight:1.75,marginBottom:14 }}>{getDesc(selectedPlant)}</p>
                  <div style={{ display:"flex",gap:8,marginBottom:18 }}>
                    {[[L.dosha,selectedPlant.dosha],[L.season,selectedPlant.season],[L.distance,"~1 km"]].map(([lbl,val])=>(
                      <div key={lbl} style={{ flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 6px",textAlign:"center" }}>
                        <div style={{ fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:2 }}>{lbl}</div>
                        <div style={{ fontSize:11,color:C.warm,fontWeight:600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>toggleSave(selectedPlant)} style={{ width:"100%",padding:"10px",borderRadius:12,marginBottom:14,background:savedIds.has(selectedPlant.id)?`${ac}22`:"transparent",border:`1.5px solid ${ac}`,color:ac,cursor:"pointer",fontSize:13,fontWeight:600 }}>
                    {savedIds.has(selectedPlant.id)?L.savedBtn:`♡ ${L.saveBtn}`}
                  </button>
                </div>
                <div style={{ padding:"0 18px",marginBottom:12 }}>
                  <div style={{ display:"flex",gap:5 }}>
                    {["benefits","uses","proscons","videos"].map(s=>(
                      <button key={s} onClick={()=>setSection(s)} style={{ flex:1,padding:"7px 3px",background:section===s?`${ac}22`:C.surface,border:`1px solid ${section===s?ac:C.border}`,borderRadius:9,color:section===s?ac:C.muted,cursor:"pointer",fontSize:9,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase" }}>
                        {s==="benefits"?L.benefits:s==="uses"?L.uses:s==="proscons"?L.proscons:"🎬"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding:"0 18px 80px" }}>
                  {section==="benefits"&&(selectedPlant.benefits??[]).map((b,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",background:`${ac}10`,border:`1px solid ${ac}25`,borderRadius:11,padding:"11px 14px",marginBottom:8 }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",background:ac,flexShrink:0,marginTop:5 }}/>
                      <span style={{ fontSize:13,color:"#d4c8b8",lineHeight:1.5 }}>{b}</span>
                    </div>
                  ))}
                  {section==="uses"&&(selectedPlant.uses??[]).map((u,i)=>(
                    <div key={i} style={{ background:`${ac}10`,border:`1px solid ${ac}25`,borderRadius:11,padding:"12px 14px",marginBottom:8 }}>
                      <div style={{ fontSize:9,color:ac,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3 }}>Method {i+1}</div>
                      <div style={{ fontSize:13,color:"#d4c8b8" }}>{u}</div>
                    </div>
                  ))}
                  {section==="proscons"&&(
                    <>
                      <div style={{ fontSize:9,color:"#7aaf85",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7 }}>✓ {L.pros}</div>
                      {(selectedPlant.pros??[]).map((p,i)=>(<div key={i} style={{ background:"rgba(122,175,133,0.08)",border:"1px solid rgba(122,175,133,0.2)",borderRadius:11,padding:"11px 14px",marginBottom:7,fontSize:13,color:"#b8d4bc" }}>{p}</div>))}
                      <div style={{ fontSize:9,color:"#e88080",letterSpacing:"0.1em",textTransform:"uppercase",margin:"14px 0 7px" }}>⚠ {L.cons}</div>
                      {(selectedPlant.cons??[]).map((c,i)=>(<div key={i} style={{ background:"rgba(232,128,128,0.07)",border:"1px solid rgba(232,128,128,0.18)",borderRadius:11,padding:"11px 14px",marginBottom:7,fontSize:13,color:"#e8b0b0" }}>{c}</div>))}
                    </>
                  )}
                  {section==="videos"&&getVideos(selectedPlant).map((v,i)=>(
                    <a key={i} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:12,padding:"11px 13px",marginBottom:10,textDecoration:"none" }}>
                      <div style={{ width:36,height:36,borderRadius:9,background:"rgba(255,80,80,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff5050"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:12,color:C.warm,fontWeight:500,marginBottom:2 }}>{v.title}</div>
                        <div style={{ fontSize:10,color:"#ff8080" }}>{v.channel}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* SCAN */}
          {tab==="scan"&&(
            <div style={{ padding:"28px 20px" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:C.warm,marginBottom:6 }}>{L.scanTitle}</h2>
              <p style={{ fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:20 }}>{L.scanSubtitle}</p>
              {scanState==="idle"&&(
                <div style={{ display:"flex",gap:8,marginBottom:20 }}>
                  {[["gallery","📁",L.gallery],["camera","📷",L.camera]].map(([m,ic,lbl])=>(
                    <button key={m} onClick={()=>setScanMode(m)} style={{ flex:1,padding:"9px",borderRadius:12,background:scanMode===m?`${C.accent}22`:C.surface,border:`1.5px solid ${scanMode===m?C.accent:C.border}`,color:scanMode===m?C.accent:C.muted,cursor:"pointer",fontSize:13,fontWeight:600 }}>{ic} {lbl}</button>
                  ))}
                </div>
              )}
              {scanMode==="gallery"&&scanState==="idle"&&(
                <div onClick={()=>fileRef.current?.click()} style={{ border:`2px dashed ${C.accent}44`,borderRadius:18,padding:"40px 20px",textAlign:"center",cursor:"pointer",background:`${C.accent}06` }}>
                  <div style={{ fontSize:48,marginBottom:12,animation:"float 4s ease infinite" }}>🌿</div>
                  <div style={{ fontSize:14,color:C.accent,fontWeight:600,marginBottom:4 }}>{L.scanBtn}</div>
                  <div style={{ fontSize:11,color:C.muted }}>JPG, PNG up to 10MB</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>processScanImage(e.target.files[0])} />
                </div>
              )}
              {scanMode==="camera"&&scanState==="idle"&&(
                <div style={{ position:"relative",borderRadius:18,overflow:"hidden",marginBottom:16 }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",borderRadius:18,maxHeight:300,objectFit:"cover",background:"#000" }} />
                  {[0,1,2,3].map(i=>(
                    <div key={i} style={{ position:"absolute",width:22,height:22,borderColor:C.accent,borderStyle:"solid",borderWidth:0,
                      ...(i===0&&{top:8,left:8,borderTopWidth:3,borderLeftWidth:3,borderTopLeftRadius:6}),
                      ...(i===1&&{top:8,right:8,borderTopWidth:3,borderRightWidth:3,borderTopRightRadius:6}),
                      ...(i===2&&{bottom:8,left:8,borderBottomWidth:3,borderLeftWidth:3,borderBottomLeftRadius:6}),
                      ...(i===3&&{bottom:8,right:8,borderBottomWidth:3,borderRightWidth:3,borderBottomRightRadius:6}),
                    }}/>
                  ))}
                  <button onClick={captureFromCamera} style={{ position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",width:58,height:58,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#a06840)`,border:"3px solid white",cursor:"pointer",boxShadow:`0 4px 18px ${C.accent}66` }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display:"block",margin:"auto" }}>
                      <circle cx="12" cy="12" r="4" fill="white"/>
                      <path d="M20 5h-2.83l-1.34-1.5A2 2 0 0014.35 3H9.65a2 2 0 00-1.48.5L6.83 5H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2z" stroke="white" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                </div>
              )}
              {scanState==="scanning"&&(
                <div style={{ textAlign:"center",padding:"40px 0" }}>
                  {previewUrl&&<img src={previewUrl} alt="" style={{ width:140,height:140,objectFit:"cover",borderRadius:16,marginBottom:20,border:`2px solid ${C.accent}44` }}/>}
                  <Spinner size={50}/><div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,color:C.warm,marginTop:18,marginBottom:6 }}>{L.scanning}</div>
                  <div style={{ fontSize:11,color:C.muted }}>500+ {L.scanMatch}</div>
                </div>
              )}
              {scanState==="error"&&(
                <div style={{ textAlign:"center",padding:"40px 0" }}>
                  <div style={{ fontSize:48,marginBottom:12 }}>⚠️</div>
                  <div style={{ fontSize:15,color:C.warm,marginBottom:8 }}>Identification failed</div>
                  <button onClick={()=>setScanState("idle")} style={{ background:`${C.accent}22`,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"9px 22px",cursor:"pointer",fontSize:13 }}>Try Again</button>
                </div>
              )}
              {scanState==="result"&&scanResult&&(
                <div style={{ animation:"fadeUp 0.35s ease" }}>
                  {previewUrl&&<img src={previewUrl} alt="" style={{ width:"100%",maxHeight:200,objectFit:"cover",borderRadius:16,marginBottom:18,border:`2px solid ${C.accent}33` }}/>}
                  <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18,marginBottom:14 }}>
                    <div style={{ fontSize:10,color:scanResult.dbMatch?"#7aaf85":C.accent,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>
                      {scanResult.dbMatch?`✓ ${L.matchFound}`:`🔍 ${L.noMatch}`}
                    </div>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:C.warm,marginBottom:4 }}>
                      {scanResult.dbMatch?getName(scanResult.dbMatch):scanResult.name}
                    </div>
                    {scanResult.commonNames.length>0&&(<div style={{ fontSize:11,color:C.muted,marginBottom:10 }}>Also known as: {scanResult.commonNames.slice(0,3).join(", ")}</div>)}
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                      <div style={{ height:6,flex:1,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${scanResult.confidence}%`,background:`linear-gradient(90deg,${C.accent},#7aaf85)`,borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:13,color:C.accent,fontWeight:600,whiteSpace:"nowrap" }}>{scanResult.confidence}% {L.confidence}</div>
                    </div>
                    {scanResult.description&&(<p style={{ fontSize:12,color:"#b8a898",lineHeight:1.7,margin:0 }}>{scanResult.description.slice(0,200)}...</p>)}
                  </div>

                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {scanResult.dbMatch&&(
                      <button onClick={()=>{setSelectedPlant(scanResult.dbMatch);setScanState("idle");setPreviewUrl(null);}} style={{ width:"100%",padding:"12px",borderRadius:12,background:`linear-gradient(135deg,${C.accent},#a06840)`,border:"none",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,boxShadow:`0 6px 18px ${C.accent}44` }}>
                        {L.viewDetails} →
                      </button>
                    )}

                    {/* ── ADD TO DATABASE BUTTON (shown only when NOT in DB) ── */}
                    {!scanResult.dbMatch&&(
                      <button onClick={()=>setShowAddPanel(true)} style={{
                        width:"100%",padding:"13px",borderRadius:12,
                        background:"linear-gradient(135deg,#7aaf85,#4a9e60)",
                        border:"none",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,
                        boxShadow:"0 6px 22px rgba(122,175,133,0.45)",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:9,
                        letterSpacing:"0.02em",
                      }}>
                        <span style={{ fontSize:18 }}>🌿</span> {L.addToDb}
                      </button>
                    )}

                    <button onClick={()=>{setScanState("idle");setPreviewUrl(null);}} style={{ width:"100%",padding:"11px",borderRadius:12,background:"transparent",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontSize:13 }}>
                      Scan Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SAVED */}
          {tab==="saved"&&(
            <div style={{ padding:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:C.warm,marginBottom:18 }}>{L.savedTitle}</h2>
              {savedPlants.length===0?<EmptyState icon="♡" text={L.savedEmpty}/>:(
                <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                  {savedPlants.map((p,i)=>(
                    <PlantCard key={p.id} plant={p} getName={getName} accent={ACCENT_MAP[i%ACCENT_MAP.length]}
                      isSaved={true} onSave={()=>toggleSave(p)}
                      onClick={()=>{setSelectedPlant(p);setSection("benefits");setTab("discover");}} delay={i*0.07}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {tab==="history"&&(
            <div style={{ padding:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:C.warm,marginBottom:18 }}>{L.historyTitle}</h2>
              {scanHistory.length===0?<EmptyState icon="🕐" text={L.historyEmpty}/>:(
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {scanHistory.map((scan,i)=>(
                    <div key={scan.id} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 15px",animation:`fadeUp 0.4s ease ${i*0.06}s both`,display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:15,color:C.warm,fontFamily:"'Playfair Display',serif",marginBottom:3 }}>{scan.identified_name}</div>
                        <div style={{ fontSize:11,color:C.muted }}>{new Date(scan.scanned_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
                        {scan.location_name&&<div style={{ fontSize:10,color:"#7a6858",marginTop:2 }}>📍 {scan.location_name}</div>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:13,color:C.accent,fontWeight:700,marginBottom:3 }}>{Math.round((scan.confidence??0)*100)}%</div>
                        <div style={{ fontSize:10,padding:"2px 8px",borderRadius:8,background:scan.plant_id?"rgba(122,175,133,0.12)":"rgba(200,149,108,0.1)",color:scan.plant_id?"#7aaf85":C.muted }}>
                          {scan.plant_id?"In DB ✓":"Not in DB"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── PlantCard ─────────────────────────────────────────────────
function PlantCard({ plant, getName, accent, isSaved, onSave, onClick, delay }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ background:hovered?`${accent}12`:"rgba(35,26,20,0.7)",border:`1px solid ${hovered?accent+"45":"rgba(200,149,108,0.12)"}`,borderRadius:15,padding:"13px 14px",cursor:"pointer",transition:"all 0.22s",transform:hovered?"translateY(-2px)":"none",boxShadow:hovered?`0 6px 20px ${accent}20`:"none",animation:`fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div onClick={onClick} style={{ flex:1,display:"flex",gap:11,alignItems:"flex-start" }}>
          <span style={{ fontSize:26,lineHeight:1 }}>{plant.emoji||"🌿"}</span>
          <div>
            <div style={{ fontSize:16,color:"#f0e8dc",fontFamily:"'Playfair Display',serif",fontWeight:700,marginBottom:1 }}>{getName(plant)}</div>
            <div style={{ fontSize:10,color:"#9a8878",fontStyle:"italic",marginBottom:7 }}>{plant.latin_name}</div>
            <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{(plant.tags??[]).slice(0,2).map(t=><Tag key={t} label={t} accent={accent}/>)}</div>
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
          <button onClick={e=>{e.stopPropagation();onSave();}} style={{ background:isSaved?`${accent}22`:"transparent",border:`1px solid ${accent}55`,borderRadius:8,width:30,height:30,cursor:"pointer",color:accent,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s" }}>
            {isSaved?"♥":"♡"}
          </button>
          <div style={{ fontSize:10,color:"#9a8878",background:"rgba(200,149,108,0.1)",padding:"2px 6px",borderRadius:7 }}>{plant.rarity}</div>
        </div>
      </div>
    </div>
  );
}