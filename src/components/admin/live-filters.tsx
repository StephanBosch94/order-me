"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Input, Select } from "@/components/ui/fields";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Category } from "@/lib/data/types";
import type { OrderListFilters } from "@/components/admin/orders-browser";

export function OrderFilters({ q, status, from, to, sort }: OrderListFilters) {
  const [query, setQuery] = useState(q);
  const [statusValue, setStatusValue] = useState(status);
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);
  const [sortValue, setSortValue] = useState(sort);
  const publish = useQueryPublisher();

  useSyncedState(q, setQuery, "q");
  useSyncedState(status, setStatusValue, "status");
  useSyncedState(from, setFromValue, "from");
  useSyncedState(to, setToValue, "to");
  useSyncedState(sort, setSortValue, "sort");

  const next = (patch: Partial<OrderListFilters>, immediate: boolean) => {
    const values = {
      q: query,
      status: statusValue,
      from: fromValue,
      to: toValue,
      sort: sortValue,
      ...patch,
    };
    publish(
      {
        q: values.q.trim(),
        status: values.status === "all" ? "" : values.status,
        from: values.from,
        to: values.to,
        sort: values.sort === "newest" ? "" : values.sort,
      },
      immediate,
    );
  };

  return (
    <form
      className="mb-4 grid gap-2 rounded-lg border border-border bg-card p-3 md:grid-cols-6"
      onSubmit={(event) => {
        event.preventDefault();
        next({}, true);
      }}
    >
      <Input
        name="q"
        value={query}
        placeholder="Broj ili kupac"
        aria-label="Pretraga porudžbina"
        className="md:col-span-2"
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          next({ q: value }, false);
        }}
      />
      <Select
        name="status"
        value={statusValue}
        aria-label="Status"
        onChange={(event) => {
          const value = event.target.value as OrderListFilters["status"];
          setStatusValue(value);
          next({ status: value }, true);
        }}
      >
        <option value="all">Svi statusi</option>
        {ORDER_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Input
        name="from"
        type="date"
        value={fromValue}
        aria-label="Datum od"
        onChange={(event) => {
          const value = event.target.value;
          setFromValue(value);
          next({ from: value }, true);
        }}
      />
      <Input
        name="to"
        type="date"
        value={toValue}
        aria-label="Datum do"
        onChange={(event) => {
          const value = event.target.value;
          setToValue(value);
          next({ to: value }, true);
        }}
      />
      <Select
        name="sort"
        value={sortValue}
        aria-label="Sortiranje"
        onChange={(event) => {
          const value = event.target.value as OrderListFilters["sort"];
          setSortValue(value);
          next({ sort: value }, true);
        }}
      >
        <option value="newest">Najnovije</option>
        <option value="oldest">Najstarije</option>
        <option value="total_desc">Najveći iznos</option>
        <option value="total_asc">Najmanji iznos</option>
      </Select>
    </form>
  );
}

export function ProductFilters({
  q,
  category,
  active,
  categories,
}: {
  q: string;
  category: string;
  active: string;
  categories: Category[];
}) {
  const [query, setQuery] = useState(q);
  const [categoryValue, setCategoryValue] = useState(category);
  const [activeValue, setActiveValue] = useState(active);
  const publish = useQueryPublisher();

  useSyncedState(q, setQuery, "q");
  useSyncedState(category, setCategoryValue, "category");
  useSyncedState(active, setActiveValue, "active");

  const next = (patch: { q?: string; category?: string; active?: string }, immediate: boolean) => {
    const values = { q: query, category: categoryValue, active: activeValue, ...patch };
    publish(
      {
        q: values.q.trim(),
        category: values.category,
        active: values.active === "all" ? "" : values.active,
      },
      immediate,
    );
  };

  return (
    <form
      className="mb-4 grid gap-2 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        next({}, true);
      }}
    >
      <Input
        name="q"
        value={query}
        placeholder="Pretraži proizvode"
        aria-label="Pretraži proizvode"
        className="md:col-span-2"
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          next({ q: value }, false);
        }}
      />
      <Select
        name="category"
        value={categoryValue}
        aria-label="Kategorija"
        onChange={(event) => {
          const value = event.target.value;
          setCategoryValue(value);
          next({ category: value }, true);
        }}
      >
        <option value="">Sve kategorije</option>
        {categories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        name="active"
        value={activeValue}
        aria-label="Status proizvoda"
        onChange={(event) => {
          const value = event.target.value;
          setActiveValue(value);
          next({ active: value }, true);
        }}
      >
        <option value="all">Svi</option>
        <option value="active">Aktivni</option>
        <option value="inactive">Neaktivni</option>
      </Select>
    </form>
  );
}

function useQueryPublisher() {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (values: Record<string, string>, immediate: boolean) => {
    const run = () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(values)) {
        if (value) params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };
    if (timer.current) clearTimeout(timer.current);
    if (immediate) run();
    else timer.current = setTimeout(run, 300);
  };
}

function useSyncedState<T extends string>(value: T, setValue: (value: T) => void, name: string) {
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.name === name && active.value !== value) return;
    setValue(value);
  }, [name, setValue, value]);
}
