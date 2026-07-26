import { useState } from "react";
import { toast } from "sonner";
import { Ruler, MapPin, CalendarHeart, ChevronRight, Plus } from "lucide-react";
import { BottomSheet } from "../BottomSheet";
import api, { apiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const PURPOSES = ["Casual", "Office", "Wedding", "Festival", "Gift"];

export const DecisionSteps = ({ state, setState, evaluation }) => {
  const { user, refreshUser } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [newAddr, setNewAddr] = useState({ label: "Home", receiver: user?.name || "", phone: "", line1: "", city: "", state: "", pin: "" });
  const [newFp, setNewFp] = useState({ name: "", height_cm: 160, weight_kg: 55, body_shape: "Pear", preferred_fit: "Regular", language: "en" });

  const fp = user?.fit_profiles?.find((f) => f.id === state.fitProfileId);
  const addr = user?.addresses?.find((a) => a.id === state.addressId);

  const saveAddress = async () => {
    if (!newAddr.line1 || !newAddr.pin || !newAddr.city) return toast.error("Please fill address, city and PIN");
    try {
      const { data } = await api.post("/me/addresses", newAddr);
      await refreshUser();
      setState((s) => ({ ...s, addressId: data.id }));
      setSheet(null);
      toast.success("Address added");
    } catch (e) { toast.error(apiError(e)); }
  };

  const saveFp = async () => {
    if (!newFp.name) return toast.error("Give this profile a name");
    try {
      const { data } = await api.post("/me/fit-profiles", newFp);
      await refreshUser();
      setState((s) => ({ ...s, fitProfileId: data.id }));
      setSheet(null);
      toast.success("Fit profile created");
    } catch (e) { toast.error(apiError(e)); }
  };

  const Step = ({ n, icon: Icon, title, value, cta, onClick, testId, done }) => (
    <button data-testid={testId} onClick={onClick}
      className={`w-full flex items-center gap-3 border rounded-xl p-4 text-left transition-colors ${done ? "border-[#03A685]/40 bg-[#03A685]/[0.04]" : "border-gray-200 hover:border-[#FF3E6C]/50"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-[#03A685] text-white" : "bg-[#F5F5F6] text-[#535766]"}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7E818C]">Step {n} — {title}</p>
        <p className="text-sm font-semibold text-[#282C3F] truncate mt-0.5">{value}</p>
      </div>
      <span className="text-xs font-bold text-[#FF3E6C] flex items-center shrink-0">{cta} <ChevronRight size={14} /></span>
    </button>
  );

  return (
    <div className="space-y-3">
      <Step n={1} icon={Ruler} title="Fit Profile" testId="step-fit-profile" done={!!fp}
        value={fp ? `Using ${fp.name}'s Fit Profile${evaluation?.recommended_size ? ` • Size ${evaluation.recommended_size} recommended` : ""}` : "Select or create a fit profile"}
        cta={fp ? "Switch" : "Select"} onClick={() => setSheet("fit")} />
      <Step n={2} icon={MapPin} title="Delivery Address" testId="step-address" done={!!addr}
        value={addr ? `${addr.label} — ${addr.city} ${addr.pin}` : "Select delivery address"}
        cta="Change" onClick={() => setSheet("address")} />
      <Step n={3} icon={CalendarHeart} title="Buying Purpose" testId="step-purpose" done={!!state.purpose}
        value={state.purpose ? `${state.purpose}${state.eventDate ? ` • Event on ${new Date(state.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}` : "What's the occasion?"}
        cta="Choose" onClick={() => setSheet("purpose")} />

      <BottomSheet open={sheet === "fit"} onClose={() => setSheet(null)} title="Choose Fit Profile" testId="fit-profile-sheet">
        <div className="space-y-2">
          {user?.fit_profiles?.map((f) => (
            <button key={f.id} data-testid={`fit-option-${f.name.toLowerCase()}`}
              onClick={() => { setState((s) => ({ ...s, fitProfileId: f.id })); setSheet(null); }}
              className={`w-full text-left border rounded-xl p-4 transition-colors ${state.fitProfileId === f.id ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
              <p className="text-sm font-bold">{f.name}</p>
              <p className="text-xs text-[#7E818C] mt-0.5">{f.height_cm}cm • {f.weight_kg}kg • {f.body_shape} • {f.preferred_fit} fit</p>
            </button>
          ))}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3 flex items-center gap-1.5"><Plus size={14} /> Create New Profile</p>
            <div className="grid grid-cols-2 gap-2">
              <input data-testid="new-fp-name" placeholder="Profile name (e.g. Mom)" value={newFp.name} onChange={(e) => setNewFp({ ...newFp, name: e.target.value })} className="col-span-2 border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-fp-height" type="number" placeholder="Height cm" value={newFp.height_cm} onChange={(e) => setNewFp({ ...newFp, height_cm: +e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-fp-weight" type="number" placeholder="Weight kg" value={newFp.weight_kg} onChange={(e) => setNewFp({ ...newFp, weight_kg: +e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <select value={newFp.body_shape} onChange={(e) => setNewFp({ ...newFp, body_shape: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white">
                {["Pear", "Hourglass", "Rectangle", "Apple", "Athletic"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={newFp.preferred_fit} onChange={(e) => setNewFp({ ...newFp, preferred_fit: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white">
                {["Fitted", "Regular", "Relaxed", "Comfort"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button data-testid="save-new-fp-btn" onClick={saveFp} className="w-full mt-3 bg-[#282C3F] text-white font-bold py-2.5 rounded-md text-xs uppercase">Create Profile</button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "address"} onClose={() => setSheet(null)} title="Choose Delivery Address" testId="address-sheet">
        <div className="space-y-2">
          {user?.addresses?.map((a) => (
            <button key={a.id} data-testid={`address-option-${a.label.toLowerCase()}`}
              onClick={() => { setState((s) => ({ ...s, addressId: a.id })); setSheet(null); }}
              className={`w-full text-left border rounded-xl p-4 transition-colors ${state.addressId === a.id ? "border-[#FF3E6C] bg-[#FF3E6C]/[0.03]" : "border-gray-200"}`}>
              <p className="text-sm font-bold">{a.label} <span className="text-xs font-normal text-[#7E818C]">• {a.receiver}</span></p>
              <p className="text-xs text-[#7E818C] mt-0.5">{a.line1}, {a.city} — {a.pin}</p>
            </button>
          ))}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#535766] mb-3 flex items-center gap-1.5"><Plus size={14} /> Add New Address</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-white">
                {["Home", "Office", "Hostel", "Parents", "Other"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <input data-testid="new-addr-phone" placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-addr-line1" placeholder="Address line" value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} className="col-span-2 border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-addr-city" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-addr-pin" placeholder="PIN code" value={newAddr.pin} onChange={(e) => setNewAddr({ ...newAddr, pin: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
              <input data-testid="new-addr-state" placeholder="State" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} className="col-span-2 border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#FF3E6C]" />
            </div>
            <button data-testid="save-new-addr-btn" onClick={saveAddress} className="w-full mt-3 bg-[#282C3F] text-white font-bold py-2.5 rounded-md text-xs uppercase">Save Address</button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "purpose"} onClose={() => setSheet(null)} title="What are you buying this for?" testId="purpose-sheet">
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <button key={p} data-testid={`purpose-${p.toLowerCase()}`}
              onClick={() => setState((s) => ({ ...s, purpose: p }))}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors ${state.purpose === p ? "bg-[#FF3E6C] text-white border-[#FF3E6C]" : "border-gray-300 text-[#535766]"}`}>
              {p}
            </button>
          ))}
        </div>
        {state.purpose && ["Wedding", "Festival", "Gift"].includes(state.purpose) && (
          <div className="mt-5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#535766]">Event date (we'll make sure it arrives before)</label>
          </div>
        )}
        <button data-testid="purpose-done-btn" onClick={() => setSheet(null)} disabled={!state.purpose}
          className="w-full mt-6 bg-[#FF3E6C] text-white font-bold py-3 rounded-md text-sm uppercase disabled:opacity-50">Done</button>
      </BottomSheet>
    </div>
  );
};
