"use client";

import { useState } from "react";

interface DescribePageModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (svg: string) => void;
}

const IDEAS = [
  "a pony eating ice cream on the moon",
  "a kitty driving a cupcake car",
  "butterflies around a rainbow castle",
  "a mermaid with a soccer ball",
  "a rocket shaped like a lollipop",
];

export function DescribePageModal({
  open,
  onClose,
  onGenerated,
}: DescribePageModalProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  if (!open) return null;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPreviewSvg(null);
    try {
      const res = await fetch("/api/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Something went wrong";
        setError(msg);
        return;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "svg" in data &&
        typeof (data as { svg: unknown }).svg === "string"
      ) {
        setPreviewSvg((data as { svg: string }).svg);
      } else {
        setError("No drawing came back. Try again!");
      }
    } catch {
      setError("Could not reach the art helper. Are you online?");
    } finally {
      setLoading(false);
    }
  };

  const usePage = () => {
    if (!previewSvg) return;
    onGenerated(previewSvg);
    setPrompt("");
    setPreviewSvg(null);
    setError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal describe-modal"
        role="dialog"
        aria-labelledby="describe-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="describe-title">Describe a page ✨</h2>
            <p>What should we draw for you to paint?</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <textarea
          className="describe-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: a unicorn pizza party in space"
          rows={3}
          maxLength={500}
          disabled={loading}
        />

        <div className="idea-row">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              className="idea-chip"
              onClick={() => setPrompt(idea)}
              disabled={loading}
            >
              {idea}
            </button>
          ))}
        </div>

        {error && <p className="error-banner">{error}</p>}

        {previewSvg && (
          <div
            className="describe-preview"
            dangerouslySetInnerHTML={{
              __html: previewSvg
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="100%"'),
            }}
          />
        )}

        <div className="modal-actions">
          {previewSvg ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={generate}
                disabled={loading || prompt.trim().length < 3}
              >
                Try again
              </button>
              <button type="button" className="btn-primary" onClick={usePage}>
                Use this page!
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={generate}
                disabled={loading || prompt.trim().length < 3}
              >
                {loading ? "Drawing…" : "Make my page!"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
