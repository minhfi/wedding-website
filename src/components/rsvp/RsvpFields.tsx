"use client";

import type { ChangeEvent } from "react";
import type { GuestId } from "@/lib/types";
import {
  MAX_COUNT,
  MIN_COUNT,
  type RsvpErrors,
  type RsvpField,
  type RsvpInput,
} from "@/lib/rsvp-validation";

/** Form state. Number fields are strings so guests can edit them freely. */
export interface RsvpFormValues {
  diTiec: "co" | "khong" | null;
  soNguoi: string;
  xeDi: boolean | null;
  gheXeDi: string;
  xeVe: boolean | null;
  gheXeVe: string;
}

export const EMPTY_RSVP_VALUES: RsvpFormValues = {
  diTiec: null,
  soNguoi: "",
  xeDi: null,
  gheXeDi: "",
  xeVe: null,
  gheXeVe: "",
};

/** `RsvpInput`, or only `guestId` while attendance is unanswered (the validator reports it). */
export type RsvpDraft = RsvpInput | { guestId: GuestId; diTiec?: undefined };

/** Empty → undefined; non-numeric → NaN, so `validateRsvp` flags it. */
function toCount(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

export function toRsvpInput(guestId: GuestId, values: RsvpFormValues): RsvpDraft {
  if (values.diTiec === null) return { guestId };
  if (values.diTiec === "khong") return { guestId, diTiec: "khong" };

  const input: RsvpInput = { guestId, diTiec: "co" };
  const soNguoi = toCount(values.soNguoi);
  if (soNguoi !== undefined) input.soNguoi = soNguoi;
  if (values.xeDi !== null) input.xeDi = values.xeDi;
  if (values.xeDi === true) {
    const gheXeDi = toCount(values.gheXeDi);
    if (gheXeDi !== undefined) input.gheXeDi = gheXeDi;
  }
  if (values.xeVe !== null) input.xeVe = values.xeVe;
  if (values.xeVe === true) {
    const gheXeVe = toCount(values.gheXeVe);
    if (gheXeVe !== undefined) input.gheXeVe = gheXeVe;
  }
  return input;
}

interface RsvpFieldsProps {
  values: RsvpFormValues;
  onChange: (values: RsvpFormValues) => void;
  errors?: RsvpErrors;
  disabled?: boolean;
}

const errorId = (field: RsvpField) => `${field}-error`;

function FieldError({ field, message }: { field: RsvpField; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="mt-2 flex items-start gap-1.5 text-body font-medium text-than">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 size-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </p>
  );
}

interface ChoiceOption<T> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string | boolean> {
  name: RsvpField;
  legend: string;
  hint?: string;
  options: readonly [ChoiceOption<T>, ChoiceOption<T>];
  value: T | null;
  onSelect: (value: T) => void;
  error?: string;
  disabled?: boolean;
}

function ChoiceGroup<T extends string | boolean>({
  name,
  legend,
  hint,
  options,
  value,
  onSelect,
  error,
  disabled,
}: ChoiceGroupProps<T>) {
  const hintId = `${name}-hint`;
  // The error is linked once, on the fieldset (jsx-a11y rejects aria-invalid on radios).
  const describedBy = [hint ? hintId : null, error ? errorId(name) : null]
    .filter((id) => id !== null)
    .join(" ");
  return (
    <fieldset aria-describedby={describedBy || undefined} className="min-w-0">
      <legend className="text-base font-medium text-than">{legend}</legend>
      {hint ? (
        <p id={hintId} className="mt-1 text-body text-da">
          {hint}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map((option) => (
          <label
            key={String(option.value)}
            className="flex min-h-11 cursor-pointer touch-manipulation items-center justify-center rounded-control border border-da bg-canh-hoa px-3 py-2 text-center text-base font-medium text-than not-has-disabled:hover:border-la-dam not-has-disabled:hover:bg-lua motion-safe:transition-colors has-checked:border-la-dam has-checked:bg-nu has-checked:text-la-dam has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-la-dam has-disabled:cursor-not-allowed has-disabled:opacity-60"
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={value === option.value}
              onChange={() => onSelect(option.value)}
              disabled={disabled}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError field={name} message={error} />
    </fieldset>
  );
}

interface CountInputProps {
  name: RsvpField;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function CountInput({ name, label, value, onValueChange, error, disabled }: CountInputProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-base font-medium text-than">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={MIN_COUNT}
        max={MAX_COUNT}
        step={1}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(name) : undefined}
        className="mt-2 min-h-11 w-28 touch-manipulation rounded-control border border-da bg-lua px-3 py-2 text-base text-than aria-invalid:border-2 aria-invalid:border-than disabled:cursor-not-allowed disabled:opacity-60"
      />
      <FieldError field={name} message={error} />
    </div>
  );
}

const ATTENDANCE_OPTIONS = [
  { value: "co", label: "Có, mình sẽ đến" },
  { value: "khong", label: "Không đến được" },
] as const;

const BUS_OPTIONS = [
  { value: true, label: "Có" },
  { value: false, label: "Không" },
] as const;

export function RsvpFields({ values, onChange, errors = {}, disabled }: RsvpFieldsProps) {
  const update = (patch: Partial<RsvpFormValues>) => onChange({ ...values, ...patch });

  return (
    <div className="space-y-6">
      <ChoiceGroup
        name="diTiec"
        legend="Bạn có đến dự tiệc không?"
        options={ATTENDANCE_OPTIONS}
        value={values.diTiec}
        onSelect={(diTiec) =>
          diTiec === "khong"
            ? onChange({ ...EMPTY_RSVP_VALUES, diTiec })
            : update({ diTiec })
        }
        error={errors.diTiec}
        disabled={disabled}
      />

      {values.diTiec === "co" ? (
        <>
          <CountInput
            name="soNguoi"
            label="Số người đi tiệc"
            value={values.soNguoi}
            onValueChange={(soNguoi) => update({ soNguoi })}
            error={errors.soNguoi}
            disabled={disabled}
          />

          <ChoiceGroup
            name="xeDi"
            legend="Đi xe khách chiều đi?"
            hint="Điểm đón và giờ xe chạy xem ở phần Xe khách phía trên."
            options={BUS_OPTIONS}
            value={values.xeDi}
            onSelect={(xeDi) => update(xeDi ? { xeDi } : { xeDi, gheXeDi: "" })}
            error={errors.xeDi}
            disabled={disabled}
          />
          {values.xeDi === true ? (
            <CountInput
              name="gheXeDi"
              label="Số ghế chiều đi"
              value={values.gheXeDi}
              onValueChange={(gheXeDi) => update({ gheXeDi })}
              error={errors.gheXeDi}
              disabled={disabled}
            />
          ) : null}

          <ChoiceGroup
            name="xeVe"
            legend="Đi xe khách chiều về?"
            options={BUS_OPTIONS}
            value={values.xeVe}
            onSelect={(xeVe) => update(xeVe ? { xeVe } : { xeVe, gheXeVe: "" })}
            error={errors.xeVe}
            disabled={disabled}
          />
          {values.xeVe === true ? (
            <CountInput
              name="gheXeVe"
              label="Số ghế chiều về"
              value={values.gheXeVe}
              onValueChange={(gheXeVe) => update({ gheXeVe })}
              error={errors.gheXeVe}
              disabled={disabled}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
