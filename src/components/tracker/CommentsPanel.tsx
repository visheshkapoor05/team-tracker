"use client";

import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import type { Comment, Profile } from "@/lib/store/types";

export function CommentsPanel({
  taskId,
  taskName,
  currentUser,
  profilesById,
  canPost,
  onClose,
  onCommentAdded,
}: {
  taskId: string;
  taskName: string;
  currentUser: Profile;
  profilesById: Record<string, Profile>;
  canPost: boolean;
  onClose: () => void;
  onCommentAdded: (taskId: string) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Fetching data on mount/taskId change, per
    // https://react.dev/learn/synchronizing-with-effects#fetching-data
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/comments?taskId=${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, body: text }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setBody("");
      onCommentAdded(taskId);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Comments</h2>
            <p className="text-xs text-muted">{taskName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted">No comments yet.</p>
          )}
          <div className="flex flex-col gap-3">
            {comments.map((c) => {
              const author = profilesById[c.author_id];
              const mine = c.author_id === currentUser.id;
              return (
                <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-indigo-600 text-white" : "bg-surface-2 text-ink"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[11px] font-semibold text-muted">
                        {author?.full_name ?? "Unknown"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{c.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${mine ? "text-indigo-100" : "text-muted"}`}
                    >
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line p-3">
          {canPost ? (
            <div className="flex items-end gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Write a comment…"
                className="max-h-24 flex-1 resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <button
                onClick={send}
                disabled={sending || !body.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted">
              You have read-only access to this thread.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
