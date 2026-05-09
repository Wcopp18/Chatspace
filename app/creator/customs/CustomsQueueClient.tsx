"use client";

import { useState } from "react";

interface CustomRequest {
  id: string;
  user_id: string;
  persona_id: string;
  scene_idea: string;
  outfit: string | null;
  mood: string | null;
  pricing_tier: string;
  price: number | null;
  status: string;
  admin_notes: string | null;
  delivered_moment_id: string | null;
  delivery_teaser_line: string | null;
  submitted_at: string;
  delivered_at: string | null;
  personas?: { display_name: string; slug: string; avatar_url: string | null } | null;
  profiles?: { username: string | null; display_name: string | null } | null;
}

interface PersonaLite {
  id: string;
  display_name: string;
  slug: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-400/15 text-yellow-300",
  approved: "bg-blue-400/15 text-blue-300",
  in_progress: "bg-purple-400/15 text-purple-300",
  completed: "bg-green-400/15 text-green-300",
  delivered: "bg-emerald-400/15 text-emerald-300",
  rejected: "bg-red-400/15 text-red-300",
};

export default function CustomsQueueClient({
  initialRequests,
  personas: _personas,
}: {
  initialRequests: CustomRequest[];
  personas: PersonaLite[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<CustomRequest | null>(null);

  const filtered = requests.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  async function refresh() {
    const res = await fetch("/api/custom-requests");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests || []);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
        <p className="text-white/70 text-sm">
          Requests come in when a user replies to a girl&apos;s
          {" "}<code className="text-white/50 bg-black/30 px-1 rounded">CURIOSITY_PROMPT</code>{" "}
          and taps the custom card. Fulfill by uploading a moment in the per-girl Moments tab,
          then mark this request <strong>delivered</strong> with the moment selected. The girl
          will text the user the next time they open chat: &quot;I made what you asked for 💜&quot;
        </p>
      </div>

      <div className="flex gap-1 bg-[#252538] rounded-xl p-1 border border-white/5 overflow-x-auto">
        {["all", "pending", "approved", "in_progress", "completed", "delivered", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 py-2 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filter === f ? "gradient-bg text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {f.replace(/_/g, " ")} ({f === "all" ? requests.length : requests.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#1E1E30] rounded-2xl border border-white/5 text-white/40 text-sm">
            No requests in this state.
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="bg-[#1E1E30] border border-white/8 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">
                    {r.personas?.display_name || "Unknown"}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || "bg-white/10 text-white/40"}`}>
                    {r.status}
                  </span>
                  {r.price && (
                    <span className="text-[10px] text-white/50">${Number(r.price).toFixed(2)}</span>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-0.5">
                  {new Date(r.submitted_at).toLocaleString()} · user: {r.profiles?.display_name || r.profiles?.username || r.user_id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setEditing(r)}
                className="text-xs gradient-bg text-white px-3 py-1.5 rounded-lg font-medium"
              >
                Manage
              </button>
            </div>

            <div className="bg-[#252538] rounded-xl p-3 space-y-1">
              <p className="text-white/80 text-sm leading-snug">{r.scene_idea}</p>
              {r.outfit && <p className="text-white/50 text-xs">Outfit: {r.outfit}</p>}
              {r.mood && <p className="text-white/50 text-xs">Mood: {r.mood}</p>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <FulfillModal
          request={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh(); }}
        />
      )}
    </div>
  );
}

function FulfillModal({
  request,
  onClose,
  onSaved,
}: {
  request: CustomRequest;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || "");
  const [deliveredMomentId, setDeliveredMomentId] = useState(request.delivered_moment_id || "");
  const [teaserLine, setTeaserLine] = useState(
    request.delivery_teaser_line || "I made what you asked for 💜",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/customs/${request.id}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes,
          delivered_moment_id: deliveredMomentId || null,
          delivery_teaser_line: teaserLine,
        }),
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E30] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white font-bold">Manage request</p>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>

        <div className="bg-[#252538] rounded-xl p-3 text-sm">
          <p className="text-white/80">{request.scene_idea}</p>
        </div>

        <div className="space-y-3">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="creator-input">
              {["pending", "approved", "in_progress", "completed", "delivered", "rejected"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>

          <Field label="Delivered moment ID (optional — paste from Moments tab)">
            <input value={deliveredMomentId} onChange={(e) => setDeliveredMomentId(e.target.value)} className="creator-input font-mono text-xs" placeholder="uuid" />
          </Field>

          <Field label="Delivery teaser line (paraphrase reference)">
            <textarea value={teaserLine} onChange={(e) => setTeaserLine(e.target.value)} rows={2} className="creator-input resize-none" />
          </Field>

          <Field label="Admin notes">
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="creator-input resize-none" />
          </Field>
        </div>

        <button onClick={save} disabled={busy} className="w-full gradient-bg text-white font-semibold py-3 rounded-xl disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/60 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
