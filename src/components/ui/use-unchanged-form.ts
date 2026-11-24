"use client";

import { type FormEvent, useCallback, useState } from "react";

function formSignature(form: HTMLFormElement) {
  const parts: string[] = [];
  for (const [key, value] of new FormData(form).entries()) {
    if (value instanceof File) {
      if (value.size === 0 && value.name === "") continue;
      parts.push(`${key}\0file\0${value.name}\0${value.size}\0${value.lastModified}`);
      continue;
    }
    parts.push(`${key}\0${value}`);
  }
  return parts.join("\n");
}

/** True until a field, file, or checkbox differs from the form's initial values. */
export function useUnchangedForm() {
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const ref = useCallback((node: HTMLFormElement | null) => {
    setForm(node);
    const signature = node ? formSignature(node) : null;
    setBaseline(signature);
    setCurrent(signature);
  }, []);

  const read = useCallback((node: HTMLFormElement) => {
    const signature = formSignature(node);
    setCurrent((prev) => (prev === signature ? prev : signature));
    return signature;
  }, []);

  const sync = useCallback((event: FormEvent<HTMLFormElement>) => {
    const node = event.currentTarget;
    read(node);
    requestAnimationFrame(() => {
      if (node.isConnected) read(node);
    });
  }, [read]);

  const markClean = useCallback(() => {
    if (!form) return;
    const signature = formSignature(form);
    setBaseline(signature);
    setCurrent(signature);
  }, [form]);

  return {
    ref,
    unchanged: baseline === null || current === baseline,
    onInput: sync,
    onChange: sync,
    markClean,
  };
}
