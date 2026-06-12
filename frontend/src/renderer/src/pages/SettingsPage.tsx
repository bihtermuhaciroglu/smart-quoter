import { useEffect, useState } from "react";
import { T, inp, btn, card } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";
import {
  getSettings, updateSetting,
  getMachines, createMachine, updateMachine, deleteMachine,
  Machine, MachineInput,
} from "../api/settings";

const MACHINE_TYPES = ["Tornalama", "Frezeleme", "Taşlama", "Delme", "EDM", "Kaynak", "Diğer"];

const section = (title: string) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMut, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12 }}>
    {title}
  </div>
);

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [machines, setMachines] = useState<Machine[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  const [newMachine, setNewMachine] = useState<MachineInput>({ name: "", machine_type: "Tornalama", hourly_rate: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<MachineInput | null>(null);

  async function load() {
    const [s, m] = await Promise.all([getSettings(), getMachines()]);
    setSettings(s);
    setMachines(m);
  }

  useEffect(() => { load(); }, []);

  function set(key: string, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  async function save(key: string) {
    await updateSetting(key, settings[key] ?? "");
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  async function saveAll() {
    const companyKeys = ["company_name", "app_name", "tagline", "address", "phone", "email", "tax_number",
                         "default_overhead_rate", "default_profit_margin", "currency", "groq_api_key"];
    for (const k of companyKeys) {
      if (settings[k] !== undefined) await updateSetting(k, settings[k]);
    }
    setSaved("all");
    setTimeout(() => setSaved(null), 2500);
  }

  async function addMachine() {
    if (!newMachine.name.trim()) return;
    await createMachine(newMachine);
    setNewMachine({ name: "", machine_type: "Tornalama", hourly_rate: 0 });
    load();
  }

  async function saveMachine(id: number) {
    if (!editData) return;
    await updateMachine(id, editData);
    setEditingId(null);
    setEditData(null);
    load();
  }

  async function removeMachine(id: number) {
    if (!confirm(t.common.confirm_delete)) return;
    await deleteMachine(id);
    load();
  }

  const fieldRow = (label: string, key: string, type = "text", placeholder = "") => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 180, fontSize: 13, color: T.textSec, flexShrink: 0 }}>{label}</div>
      <input
        type={type}
        value={settings[key] ?? ""}
        placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        style={{ ...inp(), flex: 1 }}
      />
      {saved === key && <span style={{ fontSize: 11, color: T.green }}>✓ {t.common.saved}</span>}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      {/* Sol kolon: Firma + API */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Firma bilgileri */}
        <div style={card()}>
          {section(t.settings.companyInfo)}
          {fieldRow(t.settings.companyName, "company_name", "text", "DBS CNC")}
          {fieldRow(t.settings.appName, "app_name", "text", "Smart Quoter")}
          {fieldRow(t.settings.tagline, "tagline", "text")}
          {fieldRow(t.settings.address, "address", "text")}
          {fieldRow(t.settings.phone, "phone", "text")}
          {fieldRow(t.settings.email, "email", "email")}
          {fieldRow(t.settings.taxNumber, "tax_number", "text")}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={saveAll} style={btn(T.accent)}>{t.common.saveAll}</button>
            {saved === "all" && <span style={{ fontSize: 12, color: T.green }}>✓ {t.common.saved}</span>}
          </div>
        </div>

        {/* Varsayılan maliyet parametreleri */}
        <div style={card()}>
          {section(t.settings.costParams)}
          {fieldRow(t.settings.overheadRate, "default_overhead_rate", "number", "15")}
          {fieldRow(t.settings.profitMargin, "default_profit_margin", "number", "20")}
          {fieldRow(t.settings.currency, "currency", "text", "₺")}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={saveAll} style={btn(T.green)}>{t.common.save}</button>
            {saved === "all" && <span style={{ fontSize: 12, color: T.green }}>✓ {t.common.saved}</span>}
          </div>
        </div>

        {/* API ayarları */}
        <div style={card()}>
          {section(t.settings.apiSettings)}
          <div style={{ fontSize: 12, color: T.textMut, marginBottom: 12 }}>
            {t.settings.apiKeyHint}{" "}
            <a href="https://console.groq.com" target="_blank" style={{ color: T.accent }}>console.groq.com</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 180, fontSize: 13, color: T.textSec, flexShrink: 0 }}>{t.settings.apiKeyLabel}</div>
            <input
              type="password"
              value={settings["groq_api_key"] ?? ""}
              placeholder="gsk_..."
              onChange={e => set("groq_api_key", e.target.value)}
              style={{ ...inp(), flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => save("groq_api_key")} style={btn(T.accent)}>{t.common.save}</button>
            {saved === "groq_api_key" && <span style={{ fontSize: 12, color: T.green }}>✓ {t.common.saved}</span>}
          </div>
        </div>
      </div>

      {/* Sağ kolon: Makine tanımları */}
      <div style={{ width: 420, flexShrink: 0 }}>
        <div style={card()}>
          {section(t.settings.machines)}

          {/* Yeni makine formu */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder={t.settings.machineName}
                value={newMachine.name}
                onChange={e => setNewMachine(p => ({ ...p, name: e.target.value }))}
                style={inp()}
              />
              <select
                value={newMachine.machine_type}
                onChange={e => setNewMachine(p => ({ ...p, machine_type: e.target.value }))}
                style={{ ...inp(), flex: "none", width: 130 }}
              >
                {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                placeholder={t.settings.hourlyRate}
                value={newMachine.hourly_rate || ""}
                onChange={e => setNewMachine(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || 0 }))}
                style={inp()}
              />
              <input
                placeholder={t.settings.machineNotes}
                value={newMachine.notes ?? ""}
                onChange={e => setNewMachine(p => ({ ...p, notes: e.target.value }))}
                style={inp()}
              />
              <button onClick={addMachine} style={{ ...btn(T.green), whiteSpace: "nowrap" }}>+ {t.common.add}</button>
            </div>
          </div>

          {/* Makine listesi */}
          {machines.length === 0 ? (
            <div style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              {t.settings.noMachines}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {machines.map(m => (
                <div key={m.id} style={{ background: T.bgPanel, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
                  {editingId === m.id && editData ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={editData.name} onChange={e => setEditData(p => p ? { ...p, name: e.target.value } : p)} style={inp()} />
                        <select value={editData.machine_type} onChange={e => setEditData(p => p ? { ...p, machine_type: e.target.value } : p)} style={{ ...inp(), flex: "none", width: 130 }}>
                          {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="number" value={editData.hourly_rate} onChange={e => setEditData(p => p ? { ...p, hourly_rate: parseFloat(e.target.value) || 0 } : p)} style={inp()} />
                        <input placeholder={t.common.notes} value={editData.notes ?? ""} onChange={e => setEditData(p => p ? { ...p, notes: e.target.value } : p)} style={inp()} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveMachine(m.id)} style={btn(T.green, true)}>{t.common.save}</button>
                        <button onClick={() => { setEditingId(null); setEditData(null); }} style={btn(T.textMut, true)}>{t.common.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: T.textMut, marginTop: 2 }}>
                          {m.machine_type} · {m.hourly_rate} ₺/saat
                          {m.notes && ` · ${m.notes}`}
                        </div>
                      </div>
                      <button onClick={() => { setEditingId(m.id); setEditData({ name: m.name, machine_type: m.machine_type, hourly_rate: m.hourly_rate, notes: m.notes }); }} style={btn(T.accent, true)}>{t.common.edit}</button>
                      <button onClick={() => removeMachine(m.id)} style={btn(T.red, true)}>{t.common.delete}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
