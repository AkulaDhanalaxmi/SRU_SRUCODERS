import { BadgeCheck, RotateCcw, ShieldCheck, Users } from "lucide-react";

const ITEMS = [
  { icon: BadgeCheck, label: "100% Original" },
  { icon: RotateCcw, label: "Easy Returns" },
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: Users, label: "Trusted by Millions" },
];

export const TrustStrip = () => (
  <div data-testid="trust-strip" className="bg-[#F5F5F6] border-t border-gray-200 py-5 mt-10">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      {ITEMS.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center justify-center gap-2 text-[#535766]">
          <Icon size={18} className="text-[#03A685]" />
          <span className="text-xs font-semibold">{label}</span>
        </div>
      ))}
    </div>
  </div>
);
