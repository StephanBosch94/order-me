"use client";

import { useEffect, useRef } from "react";

import { confirmSignup } from "@/lib/actions/confirm-signup";

export function OpenConfirmedAccount({ tokenHash, nextPath }: { tokenHash: string; nextPath: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={confirmSignup}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="next" value={nextPath} />
      <noscript>
        <button type="submit" className="h-10 w-full rounded-[10px] bg-[#111111] text-sm font-medium text-white">
          Otvorite nalog
        </button>
      </noscript>
    </form>
  );
}
