import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Zap, Droplets, Lightbulb, Wrench, Archive, RotateCcw, Printer, CalendarClock } from 'lucide-react';
import { fetchHouseBillFromSupabase, saveHouseBillToSupabase } from '../services/supabaseService';
import './HouseBillPage.css';

const ROOM_COUNT = 14;
const STORAGE_KEY = 'organise-moi:house-bill';

interface Room {
  id: number;
  name: string;
  present: boolean;
  previousIndex: number; // relevé du mois précédent (kWh)
  currentIndex: string; // relevé saisi ce mois (kWh), string pour l'input
  flatRate?: number | null; // forfait électricité (compteur en panne) — remplace le calcul au kWh
  flatReason?: string; // raison du forfait (ex. compteur en panne)
  people?: number; // nombre de personnes dans la chambre (eau = prix × personnes)
}

interface Rates {
  kwhPrice: number;
  water: number;
  publicLights: number;
  tank: number; // entretien tank (lavage + produits purificateurs), par personne présente (variable)
}

interface BillArchive {
  date: string;
  dueDate?: string; // date limite de paiement (YYYY-MM-DD)
  total: number;
  rows: { name: string; kwh: number; total: number; from?: number; to?: number; present?: boolean; flatRate?: number | null; flatReason?: string }[];
}

interface HouseBillState {
  rooms: Room[];
  rates: Rates;
  history: BillArchive[];
  dueDate: string; // « À payer avant le » pour la période en cours (YYYY-MM-DD)
}

const defaultState = (): HouseBillState => ({
  rooms: Array.from({ length: ROOM_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Chambre ${i + 1}`,
    present: true,
    previousIndex: 0,
    currentIndex: '',
  })),
  rates: { kwhPrice: 151, water: 250, publicLights: 150, tank: 0 },
  history: [],
  dueDate: '',
});

// Fusionne avec les valeurs par défaut et migre les anciens champs tank (tankFee / tankWash / tankProducts) vers « tank ».
type RawState = Partial<Omit<HouseBillState, 'rates'>> & { rates?: Partial<Rates> & { tankFee?: number; tankWash?: number; tankProducts?: number } };
const normalize = (raw: RawState): HouseBillState => {
  const base = defaultState();
  const { tankFee, tankWash, tankProducts, ...rest } = raw.rates ?? {};
  const rates: Rates = { ...base.rates, ...rest };
  if (rest.tank === undefined) rates.tank = (tankFee ?? 0) + (tankWash ?? 0) + (tankProducts ?? 0);
  (Object.keys(rates) as (keyof Rates)[]).forEach((k) => { rates[k] = Number(rates[k]) || 0; });
  return { ...base, ...raw, rates };
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const load = (): HouseBillState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return defaultState();
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
const fmtKwh = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

interface Props {
  onBackToBoard: () => void;
}

export function HouseBillPage({ onBackToBoard }: Props) {
  const [state, setState] = useState<HouseBillState>(load);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle');
  const { rooms, history } = state;
  // Tarifs toujours normalisés (évite les NaN si un ancien format est encore en mémoire)
  const rates = useMemo(() => normalize({ rates: state.rates }).rates, [state.rates]);

  // Chargement depuis Supabase au montage (prioritaire sur le cache local)
  useEffect(() => {
    let cancelled = false;
    fetchHouseBillFromSupabase<RawState>().then((remote) => {
      if (cancelled) return;
      if (remote) setState(normalize(remote));
      setRemoteLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cache local immédiat + sauvegarde Supabase (débounce 800 ms)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    if (!remoteLoaded) return;
    setSyncStatus('saving');
    const t = setTimeout(async () => {
      const ok = await saveHouseBillToSupabase(state);
      setSyncStatus(ok ? 'saved' : 'local');
    }, 800);
    return () => clearTimeout(t);
  }, [state, remoteLoaded]);

  const updateRoom = (id: number, patch: Partial<Room>) =>
    setState((s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const updateRate = (key: keyof Rates, value: string) =>
    setState((s) => ({ ...s, rates: { ...normalize({ rates: s.rates }).rates, [key]: Number(value) || 0 } }));

  const rows = useMemo(
    () =>
      rooms.map((r) => {
        const isFlat = r.flatRate != null;
        const cur = r.currentIndex === '' || isFlat ? null : Number(r.currentIndex);
        const kwh = cur !== null && cur >= r.previousIndex ? Math.round((cur - r.previousIndex) * 100) / 100 : 0;
        const invalid = cur !== null && cur < r.previousIndex;
        const elec = isFlat ? r.flatRate! : kwh * rates.kwhPrice;
        const fixed = r.present ? rates.water * (r.people ?? 1) + rates.publicLights + rates.tank : 0;
        return { room: r, kwh, invalid, elec, total: elec + fixed };
      }),
    [rooms, rates]
  );

  const totals = rows.reduce(
    (acc, r) => ({ kwh: Math.round((acc.kwh + r.kwh) * 100) / 100, elec: acc.elec + r.elec, total: acc.total + r.total }),
    { kwh: 0, elec: 0, total: 0 }
  );
  const presentCount = rooms.filter((r) => r.present).length;

  const closeMonth = () => {
    if (rooms.some((r) => r.currentIndex === '' && r.present)) {
      if (!confirm('Certaines chambres présentes n’ont pas de relevé. Valider quand même ?')) return;
    } else if (!confirm('Valider ce relevé ? Il sera archivé et les nouveaux index deviendront les anciens pour le prochain relevé.')) return;

    const archive: BillArchive = {
      date: new Date().toISOString(),
      dueDate: state.dueDate || undefined,
      total: totals.total,
      rows: rows.map((r) => ({
        name: r.room.name,
        kwh: r.kwh,
        total: r.total,
        from: r.room.previousIndex,
        to: r.room.currentIndex === '' ? r.room.previousIndex : Number(r.room.currentIndex),
        present: r.room.present,
        flatRate: r.room.flatRate ?? null,
        flatReason: r.room.flatRate != null ? r.room.flatReason?.trim() || undefined : undefined,
      })),
    };
    setState((s) => ({
      ...s,
      history: [archive, ...s.history],
      dueDate: '',
      rooms: s.rooms.map((r) => ({
        ...r,
        previousIndex: r.currentIndex === '' ? r.previousIndex : Number(r.currentIndex),
        currentIndex: '',
      })),
    }));
  };

  const printInvoices = (items: { room: Room; kwh: number; elec: number; total: number }[]) => {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const line = (label: string, value: string) => `<tr><td>${label}</td><td class="r">${value}</td></tr>`;
    const pages = items
      .map(({ room, kwh, elec, total }) => {
        const newIdx = room.currentIndex === '' ? '—' : fmtKwh(Number(room.currentIndex));
        const fixed = room.present
          ? line(`Eau (${room.people ?? 1} pers. × ${fcfa(rates.water)})`, fcfa(rates.water * (room.people ?? 1))) +
            line('Ampoules publiques & frais de paiement de facture', fcfa(rates.publicLights)) +
            (rates.tank ? line('Entretien tank (lavage + produits purificateurs)', fcfa(rates.tank)) : '')
          : '';
        return `<section class="inv">
          <h1>Facture d’électricité & charges</h1>
          <p class="meta"><strong>${esc(room.name)}</strong><br>Date : ${date}</p>
          <table>
            ${room.flatRate != null
              ? line('Nouvel index', `${newIdx} kWh`) +
                line(`Électricité — forfait${room.flatReason?.trim() ? ` (${esc(room.flatReason.trim())})` : ''}`, fcfa(elec))
              : line('Ancien index', `${fmtKwh(room.previousIndex)} kWh`) +
                line('Nouvel index', `${newIdx} kWh`) +
                line('Consommation', `${fmtKwh(kwh)} kWh`) +
                line(`Électricité (${fmtKwh(kwh)} kWh × ${fcfa(rates.kwhPrice)})`, fcfa(elec))}
            ${fixed}
            <tr class="tot"><td>Total à payer</td><td class="r">${fcfa(total)}</td></tr>
          </table>
          ${state.dueDate ? `<p class="due">À payer avant le <strong>${fmtDate(state.dueDate)}</strong></p>` : ''}
          <p class="pay">Paiement Mixx : <strong>90 77 88 80</strong></p>
        </section>`;
      })
      .join('');
    const w = window.open('', '_blank', 'width=700,height=800');
    if (!w) {
      alert('Autorise les fenêtres pop-up pour imprimer la facture.');
      return;
    }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #111; margin: 0; }
        .inv { padding: 32px; max-width: 520px; margin: 0 auto; page-break-after: always; }
        .inv:last-child { page-break-after: auto; }
        h1 { font-size: 20px; margin: 0 0 12px; }
        .meta { color: #444; margin: 0 0 18px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 8px 4px; border-bottom: 1px solid #ddd; }
        .r { text-align: right; white-space: nowrap; }
        .tot td { font-weight: 700; font-size: 16px; border-top: 2px solid #111; border-bottom: none; }
        .due { margin: 18px 0 0; font-size: 15px; color: #b91c1c; }
        .pay { margin-top: 24px; padding: 10px 12px; border: 1px dashed #999; border-radius: 8px; font-size: 15px; }
      </style></head><body>${pages}</body></html>`);
    w.document.close();
    w.focus();
    w.onafterprint = () => w.close();
    setTimeout(() => w.print(), 200);
  };

  const reset = () => {
    if (confirm('Tout réinitialiser (chambres, tarifs et historique) ?')) setState(defaultState());
  };

  return (
    <div className="hb-page">
      <header className="hb-header">
        <button type="button" className="hb-back" onClick={onBackToBoard}>
          <ArrowLeft size={16} /> Retour
        </button>
        <h1>Facture de la maison</h1>
        <p className="hb-sub">
          {ROOM_COUNT} chambres · {presentCount} présentes
          {syncStatus === 'saving' && ' · Sauvegarde…'}
          {syncStatus === 'saved' && ' · ✓ Sauvegardé en ligne'}
          {syncStatus === 'local' && ' · ⚠ Sauvegardé localement uniquement'}
        </p>
      </header>

      <section className="hb-rates">
        <label>
          <span><Zap size={14} /> Prix du kWh</span>
          <input type="number" step="any" min={0} value={rates.kwhPrice} onChange={(e) => updateRate('kwhPrice', e.target.value)} />
        </label>
        <label>
          <span><Droplets size={14} /> Eau / personne</span>
          <input type="number" step="any" min={0} value={rates.water} onChange={(e) => updateRate('water', e.target.value)} />
        </label>
        <label>
          <span><Lightbulb size={14} /> Ampoules publiques &amp; frais de paiement</span>
          <input type="number" step="any" min={0} value={rates.publicLights} onChange={(e) => updateRate('publicLights', e.target.value)} />
        </label>
        <label>
          <span><Wrench size={14} /> Entretien tank (lavage + produits purificateurs) / présent</span>
          <input type="number" step="any" min={0} value={rates.tank} onChange={(e) => updateRate('tank', e.target.value)} />
        </label>
        <label className="hb-due">
          <span><CalendarClock size={14} /> À payer avant le</span>
          <input type="date" value={state.dueDate}
            onChange={(e) => setState((s) => ({ ...s, dueDate: e.target.value }))} />
        </label>
      </section>

      <p className="hb-help">
        À chaque relevé : saisis le <strong>nouvel index</strong> de chaque chambre, vérifie les montants,
        puis clique sur <strong>« Valider ce relevé »</strong>. Le relevé est archivé dans l’historique et
        les nouveaux index deviennent automatiquement les anciens index pour le relevé suivant.
        {history.length > 0 && ` Relevés archivés : ${history.length}.`}
      </p>

      <div className="hb-table-wrap">
        <table className="hb-table">
          <thead>
            <tr>
              <th>Chambre</th>
              <th>Présent</th>
              <th>Personnes</th>
              <th>Ancien index</th>
              <th>Nouvel index</th>
              <th title="Compteur en panne : montant fixe d’électricité">Forfait élec.</th>
              <th>kWh</th>
              <th>Électricité</th>
              <th>Charges</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ room, kwh, invalid, elec, total }) => (
              <tr key={room.id} className={room.present ? '' : 'hb-absent'}>
                <td>
                  <input className="hb-name" value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} />
                </td>
                <td>
                  <input type="checkbox" checked={room.present} onChange={(e) => updateRoom(room.id, { present: e.target.checked })} />
                </td>
                <td>
                  <input type="number" min={1} step={1} className="hb-people" value={room.people ?? 1}
                    onChange={(e) => updateRoom(room.id, { people: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </td>
                <td>
                  <input type="number" step="any" min={0} value={room.previousIndex}
                    onChange={(e) => updateRoom(room.id, { previousIndex: Number(e.target.value) || 0 })} />
                </td>
                <td>
                  <input type="number" step="any" min={0} placeholder="—" value={room.currentIndex}
                    className={invalid ? 'hb-invalid' : ''}
                    title={invalid ? 'Le nouvel index est inférieur à l’ancien' : ''}
                    onChange={(e) => updateRoom(room.id, { currentIndex: e.target.value })} />
                </td>
                <td>
                  <div className="hb-flat">
                    <input type="checkbox" checked={room.flatRate != null} title="Compteur en panne → forfait"
                      onChange={(e) => updateRoom(room.id, { flatRate: e.target.checked ? 0 : null })} />
                    {room.flatRate != null && (
                      <input type="number" step="any" min={0} value={room.flatRate} placeholder="Montant"
                        onChange={(e) => updateRoom(room.id, { flatRate: Number(e.target.value) || 0 })} />
                    )}
                  </div>
                  {room.flatRate != null && (
                    <input className="hb-flat-reason" type="text" placeholder="Raison (ex. compteur en panne)"
                      value={room.flatReason ?? ''} onChange={(e) => updateRoom(room.id, { flatReason: e.target.value })} />
                  )}
                </td>
                <td className="hb-num">{fmtKwh(kwh)}</td>
                <td className="hb-num">{fcfa(elec)}</td>
                <td className="hb-num">{fcfa(total - elec)}</td>
                <td className="hb-num hb-total">{fcfa(total)}</td>
                <td>
                  <button type="button" className="hb-print" title="Imprimer la facture"
                    onClick={() => printInvoices([{ room, kwh, elec, total }])}>
                    <Printer size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>Total maison</td>
              <td className="hb-num">{fmtKwh(totals.kwh)}</td>
              <td className="hb-num">{fcfa(totals.elec)}</td>
              <td className="hb-num">{fcfa(totals.total - totals.elec)}</td>
              <td className="hb-num hb-total">{fcfa(totals.total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="hb-actions">
        <button type="button" className="hb-primary" onClick={closeMonth}>
          <Archive size={15} /> Valider ce relevé &amp; passer au suivant
        </button>
        <button type="button" className="hb-ghost"
          onClick={() => printInvoices(rows.filter((r) => r.room.present))}>
          <Printer size={15} /> Imprimer toutes les factures
        </button>
        <button type="button" className="hb-ghost" onClick={reset}>
          <RotateCcw size={15} /> Réinitialiser
        </button>
      </div>

      {history.length > 0 && (
        <section className="hb-history">
          <h2>Historique</h2>
          {history.map((h) => (
            <details key={h.date}>
              <summary>
                {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — {fcfa(h.total)}{h.dueDate ? ` · à payer avant le ${fmtDate(h.dueDate)}` : ''}
              </summary>
              <ul>
                {h.rows.map((r) => (
                  <li key={r.name}>
                    {r.name} : {r.flatRate != null ? `forfait${r.flatReason ? ` (${r.flatReason})` : ''}` : `${r.from !== undefined ? `${r.from} → ${r.to} · ` : ''}${fmtKwh(r.kwh)} kWh`} · {fcfa(r.total)}
                    {r.present === false ? ' (absent)' : ''}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
