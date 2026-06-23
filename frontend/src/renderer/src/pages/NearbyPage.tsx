import { useState, useRef, useCallback } from "react";
import axios from "axios";
import client from "../api/client";
import { T, btn, card } from "../theme";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface Manufacturer {
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  maps_link: string;
}

type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export default function NearbyPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [radius, setRadius] = useState(10000);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function analyzeImage() {
    if (!imageFile) return;
    setAnalysisLoading(true);
    setAnalysisResult("");
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      const res = await client.post("/ai/analyze-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnalysisResult(res.data.result);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setAnalysisResult(typeof detail === "string" ? detail : "Görüntü analiz edilemedi.");
    }
    setAnalysisLoading(false);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  async function searchNearby() {
    if (!coords) return;
    setSearchLoading(true);
    setManufacturers([]);
    try {
      const query = `
[out:json][timeout:30];
(
  node["craft"~"metal|metalwork|blacksmith|machine_shop|cnc"](around:${radius},${coords.lat},${coords.lng});
  way["craft"~"metal|metalwork|blacksmith|machine_shop|cnc"](around:${radius},${coords.lat},${coords.lng});
  node["industrial"~"metal|machine"](around:${radius},${coords.lat},${coords.lng});
  node["shop"~"metal|tools|industrial"](around:${radius},${coords.lat},${coords.lng});
  node["name"~"CNC|Makine|İmalat|Metal|Torna|Freze|Sanayi|cnc|machine|metalwork",i](around:${radius},${coords.lat},${coords.lng});
  way["name"~"CNC|Makine|İmalat|Metal|Torna|Freze|Sanayi|cnc|machine|metalwork",i](around:${radius},${coords.lat},${coords.lng});
);
out center 40;
`.trim();

      const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 35000,
      });

      const seen = new Set<string>();
      const results: Manufacturer[] = [];
      for (const el of res.data.elements || []) {
        const tags = el.tags || {};
        const name = tags.name || tags.brand;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const lat = el.type === "node" ? el.lat : el.center?.lat;
        const lng = el.type === "node" ? el.lon : el.center?.lon;
        const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:district"], tags["addr:city"]]
          .filter(Boolean).join(" ");
        results.push({
          name,
          lat: lat ?? null,
          lng: lng ?? null,
          type: tags.craft || tags.industrial || tags.shop || "metal imalat",
          phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "",
          email: tags.email || tags["contact:email"] || "",
          website: tags.website || tags["contact:website"] || "",
          address,
          maps_link: lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "",
        });
      }
      setManufacturers(results);
    } catch (e: any) {
      alert("Harita servisi bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.");
    }
    setSearchLoading(false);
  }

  const locationStatusInfo: Record<LocationStatus, { label: string; color: string }> = {
    idle: { label: "Konum izni istenmedi", color: T.textMut },
    requesting: { label: "Konum alınıyor...", color: T.yellow },
    granted: { label: `Konum alındı (${coords?.lat.toFixed(4)}, ${coords?.lng.toFixed(4)})`, color: T.green },
    denied: { label: "Konum izni reddedildi. Lütfen tarayıcı/sistem ayarlarından izin verin.", color: T.red },
    unavailable: { label: "Konum servisi bu cihazda mevcut değil.", color: T.red },
  };

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ ...card(), borderLeft: `4px solid ${T.accent}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          Yakınımdaki Üretim Firmaları
        </div>
        <div style={{ fontSize: 13, color: T.textSec }}>
          Parça fotoğrafınızı yükleyin — AI ne tür bir parça olduğunu analiz etsin. Ardından konumunuzu paylaşarak yakınızdaki CNC ve metal imalat firmalarını bulun.
        </div>
      </div>

      {/* Fotoğraf yükleme */}
      <div style={{ ...card() }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>
          1. Parça Fotoğrafı
        </div>

        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? T.accent : imageFile ? T.green : T.borderL}`,
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? T.accent + "11" : imageFile ? T.green + "08" : T.bgInput,
            transition: "all 0.2s",
            marginBottom: 16,
          }}
        >
          {imagePreview ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <img
                src={imagePreview}
                alt="Parça önizleme"
                style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
              />
              <span style={{ fontSize: 12, color: T.green }}>✓ {imageFile?.name}</span>
            </div>
          ) : (
            <div style={{ color: T.textSec }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 13 }}>Fotoğraf sürükle & bırak veya tıkla</div>
              <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>JPG, PNG, WEBP desteklenir</div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ ...btn(T.bgPanel, true), color: T.textSec, border: `1px solid ${T.border}` }}
          >
            📁 Dosya Seç
          </button>
          <button
            onClick={analyzeImage}
            disabled={!imageFile || analysisLoading}
            style={{ ...btn(T.accent), opacity: !imageFile ? 0.5 : 1 }}
          >
            {analysisLoading ? "Analiz ediliyor..." : "✦ AI ile Analiz Et"}
          </button>
          {imageFile && (
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); setAnalysisResult(""); }}
              style={{ ...btn(T.red, true) }}
            >
              Temizle
            </button>
          )}
        </div>

        {/* Analiz sonucu */}
        {analysisLoading && (
          <div style={{ marginTop: 16, padding: 16, background: T.bgPanel, borderRadius: 6, textAlign: "center", color: T.textSec }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>✦</div>
            <div style={{ fontSize: 13 }}>AI parçayı analiz ediyor...</div>
          </div>
        )}
        {analysisResult && !analysisLoading && (
          <div style={{ marginTop: 16, padding: 16, background: T.bgPanel, borderRadius: 6, borderLeft: `3px solid ${T.accent}` }}>
            <div style={{ fontSize: 11, color: T.textSec, fontWeight: 600, marginBottom: 8 }}>AI ANALİZ SONUCU</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: T.text, fontFamily: "inherit" }}>
              {analysisResult}
            </pre>
          </div>
        )}
      </div>

      {/* Konum */}
      <div style={{ ...card() }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>
          2. Konum & Yakın Firmalar
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={requestLocation}
            disabled={locationStatus === "requesting"}
            style={{ ...btn(locationStatus === "granted" ? T.green : T.accent) }}
          >
            {locationStatus === "requesting" ? "📍 Konum alınıyor..." :
             locationStatus === "granted" ? "📍 Konum Güncelle" :
             "📍 Konumumu Paylaş"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: T.textSec }}>Arama yarıçapı:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ fontSize: 12, padding: "4px 8px", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text }}
            >
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
              <option value={50000}>50 km</option>
            </select>
          </div>

          {coords && (
            <button
              onClick={searchNearby}
              disabled={searchLoading}
              style={{ ...btn(T.orange) }}
            >
              {searchLoading ? "Aranıyor..." : "🔍 Firmaları Ara"}
            </button>
          )}
        </div>

        {/* Konum durumu */}
        <div style={{ fontSize: 12, color: locationStatusInfo[locationStatus].color, marginBottom: 12 }}>
          {locationStatusInfo[locationStatus].label}
        </div>

        {/* Sonuçlar */}
        {searchLoading && (
          <div style={{ padding: 24, textAlign: "center", color: T.textSec }}>
            <div style={{ fontSize: 13 }}>OpenStreetMap üzerinde aranıyor...</div>
          </div>
        )}

        {!searchLoading && manufacturers.length === 0 && coords && (
          <div style={{ padding: 24, textAlign: "center", color: T.textMut, fontSize: 13 }}>
            Bu bölgede kayıtlı firma bulunamadı. Yarıçapı artırarak tekrar deneyin.
          </div>
        )}

        {manufacturers.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: T.textSec, marginBottom: 12 }}>
              {manufacturers.length} firma bulundu
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {manufacturers.map((m, i) => (
                <div
                  key={i}
                  style={{
                    background: T.bgPanel,
                    borderRadius: 8,
                    padding: "14px 16px",
                    border: `1px solid ${T.border}`,
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ fontSize: 24, lineHeight: 1 }}>🏭</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut, marginBottom: 8, textTransform: "capitalize" }}>
                      {m.type}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {m.address && (
                        <span style={{ fontSize: 12, color: T.textSec }}>
                          📍 {m.address}
                        </span>
                      )}
                      {m.phone && (
                        <a href={`tel:${m.phone}`} style={{ fontSize: 12, color: T.accent, textDecoration: "none" }}>
                          📞 {m.phone}
                        </a>
                      )}
                      {m.email && (
                        <a href={`mailto:${m.email}`} style={{ fontSize: 12, color: T.accent, textDecoration: "none" }}>
                          ✉ {m.email}
                        </a>
                      )}
                      {m.website && (
                        <a href={m.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.accent, textDecoration: "none" }}>
                          🌐 Web
                        </a>
                      )}
                      {m.maps_link && (
                        <a href={m.maps_link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.green, textDecoration: "none" }}>
                          🗺 Haritada Gör
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OSM credit */}
        <div style={{ marginTop: 16, fontSize: 10, color: T.textMut }}>
          Firma verileri OpenStreetMap katkıcılarına aittir (© OpenStreetMap). Eksik firmalar harita.openstreetmap.org üzerinden eklenebilir.
        </div>
      </div>
    </div>
  );
}
