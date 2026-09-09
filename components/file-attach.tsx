"use client";

type FileAttachButtonProps = {
  id: string;
  label: string;
  hint: string;
  accept: string;
  required?: boolean;
  fileName?: string;
  previewUrl?: string;
  frame?: { cmW: number; cmH: number; sizeLabel: string; pixelLabel: string };
  onFile: (file: File | undefined) => void;
};

export function FileAttachButton({
  id,
  label,
  hint,
  accept,
  required,
  fileName,
  previewUrl,
  frame,
  onFile,
}: FileAttachButtonProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/45 bg-primary/8 px-4 py-6 text-center transition hover:border-primary hover:bg-primary/12"
    >
      {frame ? (
        <span
          className="relative flex w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-border bg-white"
          style={{ aspectRatio: `${frame.cmW} / ${frame.cmH}` }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="px-3 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
              {frame.sizeLabel}
              <br />
              {frame.pixelLabel}
            </span>
          )}
        </span>
      ) : previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="max-h-28 rounded-xl border border-border object-contain"
        />
      ) : (
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <PaperclipIcon />
        </span>
      )}
      <span className="text-[15px] font-semibold tracking-tight text-foreground">{label}</span>
      <span className="max-w-[40ch] text-xs leading-relaxed text-muted-foreground">{hint}</span>
      {fileName ? (
        <span className="max-w-full truncate font-mono text-[11px] text-primary">{fileName}</span>
      ) : null}
      <input
        id={id}
        className="sr-only"
        type="file"
        required={required && !previewUrl}
        accept={accept}
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </label>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M8.5 12.5 15 6a3.2 3.2 0 0 1 4.5 4.5l-7.8 7.8a4.6 4.6 0 0 1-6.5-6.5l7.4-7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
