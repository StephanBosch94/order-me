"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const formRef = useRef<HTMLFormElement | null>(null);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const ref = useCallback((node: HTMLFormElement | null) => {
    formRef.current = node;
    setForm(node);
  }, []);

  const read = useCallback((node: HTMLFormElement) => {
    const signature = formSignature(node);
    setCurrent((prev) => (prev === signature ? prev : signature));
    return signature;
  }, []);

  useEffect(() => {
    if (!form) return;
    const signature = formSignature(form);
    setBaseline(signature);
    setCurrent(signature);
  }, [form]);

  useEffect(() => {
    if (!form) return;
    read(form);
  });

  const sync = useCallback(() => {
    const node = formRef.current;
    if (!node) return;
    read(node);
    requestAnimationFrame(() => {
      if (formRef.current === node) read(node);
    });
  }, [read]);

  const markClean = useCallback(() => {
    const node = formRef.current;
    if (!node) return;
    const signature = formSignature(node);
    setBaseline(signature);
    setCurrent(signature);
  }, []);

  return {
    ref,
    unchanged: baseline === null || current === baseline,
    onInput: sync,
    onChange: sync,
    markClean,
  };
}
