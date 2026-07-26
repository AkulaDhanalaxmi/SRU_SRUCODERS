import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import api from "../lib/api";
import { Header } from "../components/Header";
import { TrustStrip } from "../components/TrustStrip";

export default function NotificationsPage() {
  const [items, setItems] = useState(null);

  const load = () => api.get("/me/notifications").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await api.post("/me/notifications/read-all");
    load();
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-bold text-xl text-[#282C3F]">Notifications</h1>
          <button data-testid="mark-all-read-btn" onClick={markAll} className="text-xs font-bold text-[#FF3E6C] flex items-center gap-1"><CheckCheck size={14} /> Mark all read</button>
        </div>
        {!items ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div data-testid="empty-notifications" className="text-center py-24">
            <Bell size={48} className="mx-auto text-gray-300" />
            <p className="font-heading font-bold text-lg mt-4">No notifications yet</p>
            <p className="text-sm text-[#7E818C] mt-1">Order updates and delivery alerts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} data-testid={`notification-${n.id}`}
                className={`border rounded-xl p-4 ${n.read ? "border-gray-200" : "border-[#FF3E6C]/30 bg-[#FF3E6C]/[0.03]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#282C3F]">{n.title}</p>
                    <p className="text-xs text-[#535766] mt-1">{n.body}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-[#FF3E6C] shrink-0 mt-1.5" />}
                </div>
                <p className="text-[10px] text-[#7E818C] mt-2">{new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <TrustStrip />
    </div>
  );
}
