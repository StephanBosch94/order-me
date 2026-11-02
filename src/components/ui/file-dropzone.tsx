"use client";

import { Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_SIZE_ERROR = "Slika može imati najviše 2 MB.";
export const IMAGE_TYPE_ERROR = "Dozvoljeni formati slike su JPG, PNG i WebP.";

type FileDropzoneProps = {
  id: string;
  name: string;
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
  maxBytes?: number;
  allowedTypes?: readonly string[];
  heading: string;
  releaseHeading: string;
  hint: string;
  buttonLabel?: string;
  emptyVisual?: ReactNode;
  showImagePreview?: boolean;
  showFileName?: boolean;
  sizeError?: string;
  typeError?: string;
  limitError?: string;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  className?: string;
};

function matchesAccept(file: File, accept: string, allowedTypes?: readonly string[]) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type && allowedTypes?.some((item) => item.toLowerCase() === type)) return true;
  const tokens = accept
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return Boolean(type) && token === type;
  });
}

function assignFiles(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
}

export function FileDropzone({
  id,
  name,
  accept,
  multiple = false,
  maxFiles,
  maxBytes,
  allowedTypes,
  heading,
  releaseHeading,
  hint,
  buttonLabel = "Izaberite fajl",
  emptyVisual,
  showImagePreview = false,
  showFileName = true,
  sizeError = "Fajl je prevelik.",
  typeError = "Ovaj tip fajla nije dozvoljen.",
  limitError = "Izabrano je previše fajlova.",
  files: filesProp,
  onFilesChange,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolled, setUncontrolled] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const isControlled = filesProp !== undefined;
  const files = filesProp ?? uncontrolled;
  const filesRef = useRef(files);
  filesRef.current = files;

  function commit(next: File[]) {
    filesRef.current = next;
    const input = inputRef.current;
    if (input) assignFiles(input, next);
    if (!isControlled) setUncontrolled(next);
    onFilesChange?.(next);
  }

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    assignFiles(input, files);
  }, [files]);

  const previewFile = showImagePreview && files.length === 1 && files[0]?.type.startsWith("image/") ? files[0] : null;

  useEffect(() => {
    if (!previewFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  function take(list: FileList | null) {
    const incoming = Array.from(list ?? []).filter((file) => file.size > 0);
    if (incoming.length === 0) return;

    if (!multiple) {
      const file = incoming[0];
      if (maxBytes && file.size > maxBytes) {
        commit([]);
        setError(sizeError);
        return;
      }
      if (!matchesAccept(file, accept, allowedTypes)) {
        commit([]);
        setError(typeError);
        return;
      }
      commit([file]);
      setError(null);
      return;
    }

    let problem: string | null = null;
    const accepted: File[] = [];
    for (const file of incoming) {
      if (maxBytes && file.size > maxBytes) {
        problem ??= sizeError;
        continue;
      }
      if (!matchesAccept(file, accept, allowedTypes)) {
        problem ??= typeError;
        continue;
      }
      accepted.push(file);
    }

    const existing = filesRef.current;
    const room = Math.max(0, (maxFiles ?? Number.POSITIVE_INFINITY) - existing.length);
    if (accepted.length > room) problem ??= limitError;
    const added = accepted.slice(0, room);
    if (added.length === 0) {
      setError(problem);
      return;
    }
    commit([...existing, ...added]);
    setError(problem);
  }

  return (
    <label
      onDragEnter={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files);
      }}
      className={cn(
        "relative mt-2 flex cursor-pointer flex-col items-center overflow-hidden rounded-lg border border-dashed border-border bg-card px-6 py-8 text-center transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
        over && "border-primary bg-zinc-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => take(event.target.files)}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="size-12 rounded-md border border-border bg-white object-contain" />
      ) : (
        emptyVisual ?? (
          <span className="flex size-12 items-center justify-center rounded-md border border-border bg-zinc-50 text-muted-foreground">
            <Upload className="size-5" aria-hidden="true" />
          </span>
        )
      )}
      <p className="mt-3 text-sm font-medium">{over ? releaseHeading : heading}</p>
      <span className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "pointer-events-none mt-3")}>{buttonLabel}</span>
      {showFileName && files.length === 1 ? <p className="mt-2 max-w-full truncate text-sm">{files[0].name}</p> : null}
      {showFileName && files.length > 1 ? (
        <ul className="mt-2 w-full max-w-full space-y-0.5 text-sm">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="truncate">
              {file.name}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </label>
  );
}
