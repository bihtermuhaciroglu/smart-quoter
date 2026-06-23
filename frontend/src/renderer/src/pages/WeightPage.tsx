import { useState, useEffect } from "react";
import { T, inp, btn, card } from "../theme";
import client from "../api/client";

// Malzeme grubu → piyasa fiyat anahtarı eşlemesi
const GROUP_PRICE_KEY: Record<string, string> = {
  "Alüminyum":  "Alüminyum",
  "Bakır":      "Bakır",
  "Çinko":      "Çinko",        // metals.dev'den gelir
  "Nikel":      "Nikel",        // metals.dev'den gelir
  "Çelik":      "Çelik",        // Settings'ten manuel
  "Paslanmaz":  "Paslanmaz",    // Settings'ten manuel
  "Diğer Metal":"Titanyum",     // Settings'ten manuel (Titanyum olarak map)
  "Plastik":    null as unknown as string, // grup bazlı değil, POM/ABS vb. ayrı
};

// Yoğunluklar — g/cm³
const MATERIALS: { label: string; group: string; density: number; priceKey?: string }[] = [
  // Çelik / Demir
  { label: "Çelik (St37 / S235)",          group: "Çelik",      density: 7.85, priceKey: "Çelik" },
  { label: "Çelik (St52 / S355)",          group: "Çelik",      density: 7.85, priceKey: "Çelik" },
  { label: "Takım Çeliği (1.2379)",        group: "Çelik",      density: 7.80, priceKey: "Çelik" },
  { label: "Paslanmaz 304 (AISI 304)",     group: "Paslanmaz",  density: 7.93, priceKey: "Paslanmaz" },
  { label: "Paslanmaz 316 (AISI 316)",     group: "Paslanmaz",  density: 7.98, priceKey: "Paslanmaz" },
  { label: "Paslanmaz 430 (AISI 430)",     group: "Paslanmaz",  density: 7.70, priceKey: "Paslanmaz" },
  { label: "Dökme Demir (GG25)",           group: "Çelik",      density: 7.20, priceKey: "Dökme Demir" },
  // Alüminyum
  { label: "Alüminyum 6061",               group: "Alüminyum",  density: 2.70, priceKey: "Alüminyum" },
  { label: "Alüminyum 7075",               group: "Alüminyum",  density: 2.81, priceKey: "Alüminyum" },
  { label: "Alüminyum 2024",               group: "Alüminyum",  density: 2.78, priceKey: "Alüminyum" },
  { label: "Alüminyum 5083",               group: "Alüminyum",  density: 2.66, priceKey: "Alüminyum" },
  { label: "Alüminyum Döküm (AlSi10Mg)",   group: "Alüminyum",  density: 2.68, priceKey: "Alüminyum" },
  // Bakır & Alaşımları
  { label: "Bakır (Cu)",                   group: "Bakır",      density: 8.96, priceKey: "Bakır" },
  { label: "Pirinç (CuZn37)",              group: "Bakır",      density: 8.44, priceKey: "Pirinç" },
  { label: "Pirinç (CuZn40)",              group: "Bakır",      density: 8.50, priceKey: "Pirinç" },
  { label: "Bronz (CuSn8)",               group: "Bakır",      density: 8.80, priceKey: "Bronz" },
  // Diğer metaller
  { label: "Titanyum (Grade 2)",           group: "Diğer Metal",density: 4.51, priceKey: "Titanyum" },
  { label: "Titanyum (Grade 5 / Ti6Al4V)", group: "Diğer Metal",density: 4.43, priceKey: "Titanyum" },
  { label: "Çinko (Zn)",                   group: "Diğer Metal",density: 7.13, priceKey: "Çinko" },
  { label: "Magnezyum (AZ31)",             group: "Diğer Metal",density: 1.77 },
  { label: "Nikel (Ni 200)",               group: "Diğer Metal",density: 8.89, priceKey: "Nikel" },
  // Plastik
  { label: "Plastik — ABS",               group: "Plastik",    density: 1.05, priceKey: "Plastik-ABS" },
  { label: "Plastik — POM (Delrin)",       group: "Plastik",    density: 1.42, priceKey: "Plastik-POM" },
  { label: "Plastik — PA6 (Naylon)",       group: "Plastik",    density: 1.14, priceKey: "Plastik-PA6" },
  { label: "Plastik — PA66",              group: "Plastik",    density: 1.16, priceKey: "Plastik-PA6" },
  { label: "Plastik — PTFE (Teflon)",      group: "Plastik",    density: 2.20, priceKey: "Plastik-PTFE" },
  { label: "Plastik — PEEK",              group: "Plastik",    density: 1.32, priceKey: "Plastik-PEEK" },
  { label: "Plastik — HDPE",             group: "Plastik",    density: 0.95 },
  { label: "Plastik — PP",               group: "Plastik",    density: 0.91 },
];

type Shape =
  | "round_bar"
  | "square_bar"
  | "rect_bar"
  | "tube"
  | "sheet"
  | "hex_bar";

interface ShapeInfo {
  label: string;
  icon: string;
  fields: { key: string; label: string; unit: string; placeholder: string }[];
}

const SHAPES: Record<Shape, ShapeInfo> = {
  round_bar: {
    label: "Yuvarlak Çubuk",
    icon: "⬤",
    fields: [
      { key: "d",  label: "Çap (d)",    unit: "mm", placeholder: "örn. 30" },
      { key: "L",  label: "Uzunluk (L)",unit: "mm", placeholder: "örn. 1000" },
    ],
  },
  square_bar: {
    label: "Kare Çubuk",
    icon: "◼",
    fields: [
      { key: "a",  label: "Kenar (a)",  unit: "mm", placeholder: "örn. 40" },
      { key: "L",  label: "Uzunluk (L)",unit: "mm", placeholder: "örn. 1000" },
    ],
  },
  rect_bar: {
    label: "Dikdörtgen Çubuk",
    icon: "▬",
    fields: [
      { key: "a",  label: "En (a)",     unit: "mm", placeholder: "örn. 40" },
      { key: "b",  label: "Boy (b)",    unit: "mm", placeholder: "örn. 60" },
      { key: "L",  label: "Uzunluk (L)",unit: "mm", placeholder: "örn. 1000" },
    ],
  },
  tube: {
    label: "Boru (Tüp)",
    icon: "○",
    fields: [
      { key: "D",  label: "Dış Çap (D)",unit: "mm", placeholder: "örn. 50" },
      { key: "d",  label: "İç Çap (d)", unit: "mm", placeholder: "örn. 44" },
      { key: "L",  label: "Uzunluk (L)",unit: "mm", placeholder: "örn. 1000" },
    ],
  },
  sheet: {
    label: "Sac / Levha",
    icon: "▭",
    fields: [
      { key: "a",  label: "En (a)",     unit: "mm", placeholder: "örn. 200" },
      { key: "b",  label: "Boy (b)",    unit: "mm", placeholder: "örn. 300" },
      { key: "t",  label: "Kalınlık (t)",unit:"mm", placeholder: "örn. 5" },
    ],
  },
  hex_bar: {
    label: "Altıgen Çubuk",
    icon: "⬡",
    fields: [
      { key: "a",  label: "Anahtar Boy (a)", unit: "mm", placeholder: "örn. 24" },
      { key: "L",  label: "Uzunluk (L)",     unit: "mm", placeholder: "örn. 1000" },
    ],
  },
};

function calcVolumeCm3(shape: Shape, dims: Record<string, number>): number | null {
  const mm3ToCm3 = 1 / 1000;
  switch (shape) {
    case "round_bar": {
      const { d, L } = dims;
      if (!d || !L) return null;
      return Math.PI * Math.pow(d / 2, 2) * L * mm3ToCm3;
    }
    case "square_bar": {
      const { a, L } = dims;
      if (!a || !L) return null;
      return a * a * L * mm3ToCm3;
    }
    case "rect_bar": {
      const { a, b, L } = dims;
      if (!a || !b || !L) return null;
      return a * b * L * mm3ToCm3;
    }
    case "tube": {
      const { D, d, L } = dims;
      if (!D || !d || !L || d >= D) return null;
      return Math.PI * (Math.pow(D / 2, 2) - Math.pow(d / 2, 2)) * L * mm3ToCm3;
    }
    case "sheet": {
      const { a, b, t } = dims;
      if (!a || !b || !t) return null;
      return a * b * t * mm3ToCm3;
    }
    case "hex_bar": {
      const { a, L } = dims;
      if (!a || !L) return null;
      return (Math.sqrt(3) / 2) * a * a * L * mm3ToCm3;
    }
    default:
      return null;
  }
}

interface HistoryItem {
  id: number;
  material: string;
  shape: string;
  dims: string;
  grams: number;
  kg: number;
  qty: number;
  totalKg: number;
}

let nextId = 1;

export default function WeightPage() {
  const [materialIdx, setMaterialIdx] = useState(0);
  const [shape, setShape] = useState<Shape>("round_bar");
  const [dims, setDims] = useState<Record<string, string>>({});
  const [qty, setQty] = useState("1");
  const [result, setResult] = useState<{ grams: number; kg: number; volume: number } | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Piyasa fiyatları
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [pricesMeta, setPricesMeta] = useState<{ hasApiKey: boolean; cacheAge: number | null; source: string } | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Manuel fiyat paneli
  const [showPricePanel, setShowPricePanel] = useState(false);
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Manuel fiyat key → Settings key eşlemesi
  const PRICE_SETTING_KEYS: { label: string; settingKey: string; priceKey: string; fromLME?: boolean }[] = [
    { label: "Alüminyum",   settingKey: "",                  priceKey: "Alüminyum",  fromLME: true },
    { label: "Bakır",       settingKey: "",                  priceKey: "Bakır",      fromLME: true },
    { label: "Çinko",       settingKey: "",                  priceKey: "Çinko",      fromLME: true },
    { label: "Nikel",       settingKey: "",                  priceKey: "Nikel",      fromLME: true },
    { label: "Çelik",       settingKey: "price_steel",       priceKey: "Çelik" },
    { label: "Paslanmaz",   settingKey: "price_stainless",   priceKey: "Paslanmaz" },
    { label: "Dökme Demir", settingKey: "price_cast_iron",   priceKey: "Dökme Demir" },
    { label: "Titanyum",    settingKey: "price_titanium",    priceKey: "Titanyum" },
    { label: "Pirinç",      settingKey: "price_brass",       priceKey: "Pirinç" },
    { label: "Bronz",       settingKey: "price_bronze",      priceKey: "Bronz" },
    { label: "Plastik ABS", settingKey: "price_abs",         priceKey: "Plastik-ABS" },
    { label: "Plastik POM", settingKey: "price_pom",         priceKey: "Plastik-POM" },
    { label: "Plastik PA6", settingKey: "price_pa6",         priceKey: "Plastik-PA6" },
    { label: "PTFE",        settingKey: "price_ptfe",        priceKey: "Plastik-PTFE" },
    { label: "PEEK",        settingKey: "price_peek",        priceKey: "Plastik-PEEK" },
  ];

  async function fetchPrices() {
    setPricesLoading(true);
    try {
      const res = await client.get("/materials/prices");
      const fetched = res.data.prices || {};
      setPrices(fetched);
      setPricesMeta({
        hasApiKey: res.data.has_api_key,
        cacheAge: res.data.cache_age_minutes,
        source: res.data.source,
      });
      // Manuel alanları mevcut değerlerle önceden doldur
      const init: Record<string, string> = {};
      for (const p of PRICE_SETTING_KEYS) {
        if (!p.fromLME) {
          init[p.settingKey] = fetched[p.priceKey] != null ? String(fetched[p.priceKey]) : "";
        }
      }
      setManualPrices(init);
    } catch {
      // sessizce geç
    }
    setPricesLoading(false);
  }

  useEffect(() => { fetchPrices(); }, []);

  async function saveManualPrices() {
    setSavingPrices(true);
    setSaveMsg("");
    try {
      for (const p of PRICE_SETTING_KEYS) {
        if (!p.settingKey) continue;
        const val = manualPrices[p.settingKey] ?? "";
        await client.put(`/settings/${p.settingKey}`, { value: val || null });
        // Local prices state'i de güncelle
        if (val) {
          setPrices(prev => ({ ...prev, [p.priceKey]: parseFloat(val) }));
        }
      }
      setSaveMsg("✓ Fiyatlar kaydedildi");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("Kayıt hatası");
    }
    setSavingPrices(false);
  }

  // Şekil değişince ölçüleri sıfırla
  useEffect(() => {
    setDims({});
    setResult(null);
    setError("");
  }, [shape]);

  function handleDimChange(key: string, val: string) {
    setDims(prev => ({ ...prev, [key]: val }));
    setResult(null);
    setError("");
  }

  function calculate() {
    const numDims: Record<string, number> = {};
    for (const field of SHAPES[shape].fields) {
      const v = parseFloat(dims[field.key] || "");
      if (isNaN(v) || v <= 0) {
        setError(`"${field.label}" geçerli bir değer giriniz.`);
        return;
      }
      numDims[field.key] = v;
    }

    // Boru iç çap kontrolü
    if (shape === "tube" && numDims.d >= numDims.D) {
      setError("İç çap (d), dış çaptan (D) küçük olmalıdır.");
      return;
    }

    const vol = calcVolumeCm3(shape, numDims);
    if (!vol) { setError("Hesaplama yapılamadı."); return; }

    const density = MATERIALS[materialIdx].density;
    const grams = vol * density;
    const kg = grams / 1000;
    setResult({ grams, kg, volume: vol });
    setError("");
  }

  function addToList() {
    if (!result) return;
    const q = Math.max(1, parseInt(qty) || 1);
    const dimStr = SHAPES[shape].fields
      .map(f => `${f.label}: ${dims[f.key]} mm`)
      .join(", ");
    setHistory(prev => [
      {
        id: nextId++,
        material: MATERIALS[materialIdx].label,
        shape: SHAPES[shape].label,
        dims: dimStr,
        grams: result.grams,
        kg: result.kg,
        qty: q,
        totalKg: result.kg * q,
      },
      ...prev,
    ]);
  }

  const groups = [...new Set(MATERIALS.map(m => m.group))];
  const totalListKg = history.reduce((s, h) => s + h.totalKg, 0);

  const fieldRow: React.CSSProperties = {
    display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap",
  };
  const label14: React.CSSProperties = {
    fontSize: 12, color: T.textSec, marginBottom: 4,
  };

  return (
    <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Başlık */}
      <div style={{ ...card(), borderLeft: `4px solid ${T.accent}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
              Malzeme Ağırlık &amp; Maliyet Hesaplama
            </div>
            <div style={{ fontSize: 12, color: T.textSec }}>
              Malzeme cinsi, şekli ve ölçüleri girerek ağırlık ve tahmini piyasa maliyetini hesaplayın.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {pricesLoading && <div style={{ fontSize: 11, color: T.textMut }}>Fiyatlar yükleniyor...</div>}
            {pricesMeta && !pricesLoading && (
              <div style={{ fontSize: 10, color: pricesMeta.hasApiKey ? T.green : T.orange }}>
                {pricesMeta.hasApiKey
                  ? `✓ LME fiyatları aktif · ${pricesMeta.cacheAge != null ? `${pricesMeta.cacheAge} dk önce güncellendi` : "yeni yüklendi"}`
                  : "⚠ metals.dev API anahtarı yok — LME fiyatı alınamıyor"
                }
              </div>
            )}
            <button
              onClick={() => setShowPricePanel(p => !p)}
              style={{ ...btn(showPricePanel ? T.borderL : T.bgPanel, true), color: T.textSec, border: `1px solid ${T.border}` }}
            >
              ⚙ {showPricePanel ? "Fiyat Panelini Kapat" : "Fiyat Ayarları"}
            </button>
          </div>
        </div>
      </div>

      {/* Fiyat Ayarları Paneli */}
      {showPricePanel && (
        <div style={{ ...card(), borderTop: `3px solid ${T.accent}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
            Piyasa Fiyatları (₺ / kg)
          </div>
          <div style={{ fontSize: 12, color: T.textSec, marginBottom: 16 }}>
            <b style={{ color: T.green }}>Yeşil satırlar</b> metals.dev LME'den otomatik çekilir.{" "}
            <b style={{ color: T.accent }}>Diğerleri</b> manuel girilir ve kaydedilir.
            {!pricesMeta?.hasApiKey && (
              <span style={{ color: T.orange }}>
                {" "}· LME için{" "}
                <a href="https://metals.dev" target="_blank" rel="noreferrer" style={{ color: T.accent }}>
                  metals.dev
                </a>{" "}
                ücretsiz kayıt yapıp .env'e METALS_DEV_API_KEY ekleyin.
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {PRICE_SETTING_KEYS.map(p => {
              const lmeVal = p.fromLME ? prices[p.priceKey] : null;
              const isLME = p.fromLME && lmeVal != null;
              return (
                <div key={p.label} style={{
                  background: T.bgPanel, borderRadius: 6, padding: "10px 12px",
                  border: `1px solid ${isLME ? T.green + "55" : T.border}`,
                }}>
                  <div style={{ fontSize: 11, color: isLME ? T.green : T.textSec, fontWeight: 600, marginBottom: 6 }}>
                    {isLME ? "● " : "○ "}{p.label}
                    {isLME && <span style={{ fontWeight: 400, marginLeft: 4 }}>LME</span>}
                  </div>
                  {isLME ? (
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>
                      {lmeVal!.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="₺/kg girin"
                      value={manualPrices[p.settingKey] ?? ""}
                      onChange={e => setManualPrices(prev => ({ ...prev, [p.settingKey]: e.target.value }))}
                      style={{ ...inp(), width: "100%", boxSizing: "border-box", fontSize: 13 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={saveManualPrices}
              disabled={savingPrices}
              style={{ ...btn(T.accent) }}
            >
              {savingPrices ? "Kaydediliyor..." : "💾 Fiyatları Kaydet"}
            </button>
            <button
              onClick={fetchPrices}
              disabled={pricesLoading}
              style={{ ...btn(T.bgPanel, true), color: T.textSec, border: `1px solid ${T.border}` }}
            >
              ↻ LME'yi Yenile
            </button>
            {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✓") ? T.green : T.red }}>{saveMsg}</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Sol — hesaplama formu */}
        <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Malzeme seçimi */}
          <div style={{ ...card() }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>
              1. Malzeme Cinsi
            </div>
            <select
              value={materialIdx}
              onChange={e => setMaterialIdx(Number(e.target.value))}
              style={{ ...inp(), width: "100%" }}
            >
              {groups.map(g => (
                <optgroup key={g} label={`── ${g} ──`}>
                  {MATERIALS.map((m, i) =>
                    m.group === g ? (
                      <option key={i} value={i}>
                        {m.label}  ({m.density} g/cm³)
                      </option>
                    ) : null
                  )}
                </optgroup>
              ))}
            </select>
            <div style={{ marginTop: 8, fontSize: 12, color: T.textMut }}>
              Seçilen yoğunluk: <span style={{ color: T.accent }}>{MATERIALS[materialIdx].density} g/cm³</span>
            </div>
          </div>

          {/* Şekil seçimi */}
          <div style={{ ...card() }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>
              2. Kesit Şekli
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(SHAPES) as Shape[]).map(s => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    background: shape === s ? T.accent + "33" : T.bgInput,
                    color: shape === s ? T.accent : T.textSec,
                    border: `1px solid ${shape === s ? T.accent : T.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: shape === s ? 700 : 400,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{SHAPES[s].icon}</span>
                  {SHAPES[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Ölçüler */}
          <div style={{ ...card() }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>
              3. Ölçüler (mm)
            </div>
            <div style={fieldRow}>
              {SHAPES[shape].fields.map(f => (
                <div key={f.key} style={{ flex: "1 1 120px", minWidth: 100 }}>
                  <div style={label14}>{f.label} ({f.unit})</div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={f.placeholder}
                    value={dims[f.key] || ""}
                    onChange={e => handleDimChange(f.key, e.target.value)}
                    style={{ ...inp(), width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginTop: 10, fontSize: 12, color: T.red }}>{error}</div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={calculate} style={{ ...btn(T.accent) }}>
                Hesapla
              </button>
            </div>

            {/* Sonuç */}
            {result && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: T.bgPanel,
                borderRadius: 8,
                border: `1px solid ${T.borderL}`,
                borderLeft: `4px solid ${T.green}`,
              }}>
                <div style={{ fontSize: 11, color: T.textSec, fontWeight: 600, marginBottom: 10, letterSpacing: "0.06em" }}>
                  HESAPLAMA SONUCU
                </div>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Hacim</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
                      {result.volume.toFixed(3)} <span style={{ fontSize: 12, color: T.textSec }}>cm³</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: T.textSec }}>Ağırlık</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: T.green }}>
                      {result.grams >= 1000
                        ? `${result.kg.toFixed(3)} kg`
                        : `${result.grams.toFixed(1)} g`}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut }}>
                      = {result.grams.toFixed(2)} g &nbsp;/&nbsp; {result.kg.toFixed(4)} kg
                    </div>
                  </div>
                </div>

                {/* Piyasa fiyatı */}
                {(() => {
                  const mat = MATERIALS[materialIdx];
                  const pricePerKg = mat.priceKey ? prices[mat.priceKey] : undefined;
                  const q = parseInt(qty) || 1;
                  if (pricePerKg) {
                    const unitCost = result.kg * pricePerKg;
                    const totalCost = unitCost * q;
                    return (
                      <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: T.accentDk + "22",
                        borderRadius: 6, border: `1px solid ${T.accent}44`,
                      }}>
                        <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginBottom: 6 }}>
                          TAHMİNİ MALZEME MALİYETİ
                          <span style={{ fontWeight: 400, marginLeft: 6, color: T.textMut }}>
                            ({pricePerKg.toLocaleString("tr-TR")} ₺/kg · LME/piyasa)
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 11, color: T.textSec }}>Birim maliyet</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>
                              {unitCost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </div>
                          </div>
                          {q > 1 && (
                            <div>
                              <div style={{ fontSize: 11, color: T.textSec }}>×{q} adet toplam</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.yellow }}>
                                {totalCost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: T.textMut, marginTop: 4 }}>
                          Ham malzeme maliyeti. İşçilik, fire ve kar marjı dahil değildir.
                        </div>
                      </div>
                    );
                  }
                  const mat2 = MATERIALS[materialIdx];
                  if (mat2.priceKey && !pricesMeta?.hasApiKey) {
                    return (
                      <div style={{ marginTop: 10, fontSize: 11, color: T.textMut }}>
                        💡 Piyasa fiyatı için{" "}
                        <a href="https://metals.dev" target="_blank" rel="noreferrer" style={{ color: T.accent }}>metals.dev</a>
                        {" "}API anahtarını Ayarlar'a girin (alüminyum, bakır vb.) veya manuel fiyat ekleyin.
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Adet + listeye ekle */}
                <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: T.textSec }}>Adet:</span>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      style={{ ...inp(), width: 64 }}
                    />
                  </div>
                  <div style={{ fontSize: 13, color: T.textSec }}>
                    Toplam:{" "}
                    <span style={{ color: T.accent, fontWeight: 700 }}>
                      {(result.kg * (parseInt(qty) || 1)).toFixed(3)} kg
                    </span>
                  </div>
                  <button onClick={addToList} style={{ ...btn(T.orange, true) }}>
                    + Listeye Ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ — malzeme listesi */}
        <div style={{ flex: "1 1 300px", ...card(), minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              Malzeme Listesi
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                style={{ ...btn(T.red, true) }}
              >
                Temizle
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.textMut, fontSize: 12 }}>
              Henüz eklenen malzeme yok.<br />
              Hesapla → Listeye Ekle butonunu kullanın.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map(h => (
                  <div
                    key={h.id}
                    style={{
                      background: T.bgPanel,
                      borderRadius: 6,
                      padding: "10px 12px",
                      border: `1px solid ${T.border}`,
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                      {h.material}
                    </div>
                    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 4 }}>
                      {h.shape} — {h.dims}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                      <span style={{ color: T.textMut }}>Birim: {h.kg.toFixed(3)} kg</span>
                      <span style={{ color: T.textMut }}>×{h.qty}</span>
                      <span style={{ color: T.accent, fontWeight: 700 }}>{h.totalKg.toFixed(3)} kg</span>
                    </div>
                    <button
                      onClick={() => setHistory(prev => prev.filter(x => x.id !== h.id))}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        background: "none", border: "none", cursor: "pointer",
                        color: T.textMut, fontSize: 14, lineHeight: 1, padding: 2,
                      }}
                      title="Kaldır"
                    >×</button>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 14, paddingTop: 14,
                borderTop: `1px solid ${T.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 12, color: T.textSec }}>
                  {history.length} kalem — Toplam
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.green }}>
                  {totalListKg.toFixed(3)} kg
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
