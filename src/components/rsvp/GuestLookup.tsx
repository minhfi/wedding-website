"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { searchGuests } from "@/lib/api-client";
import type { SearchBy } from "@/lib/api-client";
import type { GuestSuggestion } from "@/lib/types";

interface GuestLookupProps {
  onSelect: (guest: GuestSuggestion) => void;
}

type LookupStatus =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; items: GuestSuggestion[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const DEBOUNCE_MS = 300;
const MIN_NAME_LENGTH = 2;
const MIN_PHONE_DIGITS = 3;

const MODES: readonly { value: SearchBy; label: string }[] = [
  { value: "ten", label: "Tên" },
  { value: "sdt", label: "SĐT" },
];

const INPUT_COPY: Record<SearchBy, { label: string; placeholder: string }> = {
  ten: { label: "Tìm tên của bạn", placeholder: "Nguyễn Văn An" },
  sdt: { label: "Nhập số điện thoại", placeholder: "0901 234 567" },
};

const IDLE: LookupStatus = { kind: "idle" };

function isSearchable(mode: SearchBy, query: string): boolean {
  return mode === "ten"
    ? query.length >= MIN_NAME_LENGTH
    : query.replace(/\D/g, "").length >= MIN_PHONE_DIGITS;
}

export function GuestLookup({ onSelect }: GuestLookupProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SearchBy>("ten");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<LookupStatus>(IDLE);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);

  const query = value.trim();
  const searchable = isSearchable(mode, query);

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const result = await searchGuests(mode, query, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        if (result.code === "aborted") return;
        setStatus({ kind: "error", message: result.message });
        return;
      }
      setActiveIndex(-1);
      setStatus(
        result.data.length > 0 ? { kind: "results", items: result.data } : { kind: "empty" },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, query, searchable, attempt]);

  const items = status.kind === "results" ? status.items : [];
  const expanded = open && items.length > 0;
  const activeId = expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined;
  const copy = INPUT_COPY[mode];

  function handleModeChange(next: SearchBy) {
    setMode(next);
    setValue("");
    setStatus(IDLE);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    setActiveIndex(-1);
    setOpen(true);
    setStatus(isSearchable(mode, next.trim()) ? { kind: "searching" } : IDLE);
  }

  function select(guest: GuestSuggestion) {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(guest);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) => (open ? Math.min(index + 1, items.length - 1) : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
        if (expanded && activeIndex >= 0) {
          event.preventDefault();
          select(items[activeIndex]);
        }
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
    }
  }

  function retry() {
    setStatus({ kind: "searching" });
    setAttempt((count) => count + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Tìm theo" className="flex gap-2">
        {MODES.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full border border-da px-4 py-1.5 text-sm font-medium text-than has-checked:border-la-dam has-checked:bg-la-dam has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-la-dam"
          >
            <input
              type="radio"
              name={`${baseId}-mode`}
              value={option.value}
              checked={mode === option.value}
              onChange={() => handleModeChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-medium text-than">
          {copy.label}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            type={mode === "sdt" ? "tel" : "text"}
            inputMode={mode === "sdt" ? "tel" : "text"}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            placeholder={copy.placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full rounded-control border border-da bg-lua px-4 py-3 text-base text-than placeholder:text-da"
          />
          {expanded && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Gợi ý khách mời"
              className="mt-1 overflow-hidden rounded-control border border-da bg-canh-hoa"
            >
              {items.map((guest, index) => (
                <li
                  key={guest.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(guest)}
                  className="cursor-pointer px-4 py-3 text-than hover:bg-lua aria-selected:bg-lua aria-selected:text-la-dam"
                >
                  {guest.ten}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div role="status" aria-live="polite" className="text-sm text-da">
        {searchable && status.kind === "searching" && (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-4 rounded-full border-2 border-nu border-t-la-dam motion-safe:animate-spin"
            />
            Đang tìm…
          </span>
        )}
        {searchable && status.kind === "empty" && (
          <>
            <p className="text-than">Không tìm thấy tên trong danh sách khách mời</p>
            <p>Nếu không thấy tên, bạn nhắn cho cô dâu chú rể nhé.</p>
          </>
        )}
        {searchable && status.kind === "error" && <p className="text-than">{status.message}</p>}
      </div>
      {searchable && status.kind === "error" && (
        <button
          type="button"
          onClick={retry}
          className="self-start rounded-control border border-la-dam px-4 py-2 text-sm font-medium text-la-dam"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
