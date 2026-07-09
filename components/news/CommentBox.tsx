"use client";

import { useState } from "react";

interface PostedComment {
  id: number;
  text: string;
}

/** UI-only comment composer — no backend/persisted thread; posts are local to the session. */
export function CommentBox() {
  const [value, setValue] = useState("");
  const [posted, setPosted] = useState<PostedComment[]>([]);
  const canPost = value.trim().length > 0;

  const post = () => {
    if (!canPost) return;
    setPosted((cur) => [{ id: Date.now(), text: value.trim() }, ...cur]);
    setValue("");
  };

  return (
    <section
      style={{
        marginTop: 44,
        padding: "20px 20px",
        borderRadius: "var(--radius-xl)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--highlight-top)",
      }}
    >
      <h3 style={{ font: "var(--fw-bold) 22px/1.1 var(--font-sans)", letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px" }}>
        {posted.length ? `Comments (${posted.length})` : "Add a comment"}
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post();
        }}
        placeholder="Share your thoughts about this story…"
        className="tas-cinput"
        style={{
          width: "100%",
          resize: "vertical",
          minHeight: 120,
          padding: "14px 16px",
          background: "var(--bg-inset)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          font: "var(--fw-regular) 17px/1.55 var(--font-sans)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <button
          onClick={post}
          disabled={!canPost}
          className="tas-cpost"
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: "0 18px",
            borderRadius: "var(--radius-md)",
            font: "var(--fw-semibold) 15px/1 var(--font-sans)",
            border: "none",
            cursor: canPost ? "pointer" : "not-allowed",
            background: canPost ? "var(--purple)" : "var(--bg-elevated)",
            color: canPost ? "#fff" : "var(--text-quaternary)",
            boxShadow: canPost ? "none" : "var(--highlight-top)",
            transition: "var(--transition-colors)",
          }}
        >
          Post Comment
        </button>
        <span style={{ font: "var(--fw-regular) var(--fs-xs)/1 var(--font-sans)", color: "var(--text-quaternary)" }}>⌘↵ to post</span>
      </div>

      {posted.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-subtle)" }}>
          {posted.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 12 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  flex: "none",
                  borderRadius: "50%",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-default)",
                  font: "var(--fw-semibold) var(--fs-xs)/1 var(--font-sans)",
                  color: "var(--text-secondary)",
                }}
              >
                You
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: "var(--fw-semibold) var(--fs-sm)/1 var(--font-sans)", color: "var(--text-primary)" }}>You</span>
                  <span style={{ font: "var(--fw-regular) var(--fs-2xs)/1 var(--font-mono)", color: "var(--text-quaternary)" }}>Just now</span>
                </div>
                <p style={{ font: "var(--fw-regular) var(--fs-body)/1.55 var(--font-sans)", color: "var(--text-secondary)", margin: "7px 0 0" }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
