"use client";

import { useEffect, useReducer, useRef } from "react";
import type { FormEvent } from "react";
import { submitRsvp } from "@/lib/api-client";
import { validateRsvp, type RsvpErrors, type RsvpField } from "@/lib/rsvp-validation";
import type { GuestSuggestion, Rsvp } from "@/lib/types";
import { GuestLookup } from "./GuestLookup";
import { EMPTY_RSVP_VALUES, RsvpFields, toRsvpInput, type RsvpFormValues } from "./RsvpFields";

type Status =
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "success"; rsvp: Rsvp }
  | { kind: "error"; message: string; canRetry: boolean };

interface State {
  guest: GuestSuggestion | null;
  values: RsvpFormValues;
  errors: RsvpErrors;
  status: Status;
}

type Action =
  | { type: "select"; guest: GuestSuggestion }
  | { type: "changeGuest" }
  | { type: "change"; values: RsvpFormValues }
  | { type: "invalid"; errors: RsvpErrors }
  | { type: "submit" }
  | { type: "succeeded"; rsvp: Rsvp }
  | { type: "failed"; message: string; fields?: RsvpErrors }
  | { type: "edit" };

const EDITING: Status = { kind: "editing" };

const INITIAL_STATE: State = {
  guest: null,
  values: EMPTY_RSVP_VALUES,
  errors: {},
  status: EDITING,
};

/** Order of the controls on screen, used to focus the first invalid one. */
const FIELD_ORDER = ["diTiec", "soNguoi", "xeDi", "gheXeDi", "xeVe", "gheXeVe"] as const;

/** Drops errors for fields whose value the guest just changed. */
function clearChangedErrors(
  errors: RsvpErrors,
  previous: RsvpFormValues,
  next: RsvpFormValues,
): RsvpErrors {
  const remaining: RsvpErrors = { ...errors };
  for (const field of FIELD_ORDER) {
    if (previous[field] !== next[field]) delete remaining[field];
  }
  return remaining;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return { ...INITIAL_STATE, guest: action.guest };
    case "changeGuest":
      return INITIAL_STATE;
    case "change":
      return {
        ...state,
        values: action.values,
        errors: clearChangedErrors(state.errors, state.values, action.values),
      };
    case "invalid":
      return { ...state, errors: action.errors, status: EDITING };
    case "submit":
      return { ...state, errors: {}, status: { kind: "submitting" } };
    case "succeeded":
      return { ...state, status: { kind: "success", rsvp: action.rsvp } };
    case "failed":
      return {
        ...state,
        errors: action.fields ?? {},
        status: { kind: "error", message: action.message, canRetry: !action.fields },
      };
    case "edit":
      return { ...state, status: EDITING };
  }
}

function firstInvalidField(errors: RsvpErrors): RsvpField | undefined {
  return FIELD_ORDER.find((field) => errors[field] !== undefined);
}

function SuccessSummary({ rsvp }: { rsvp: Rsvp }) {
  if (rsvp.diTiec === "khong") {
    return <p>Bạn đã báo không đến được. Cảm ơn bạn đã báo cho chúng mình.</p>;
  }
  return (
    <ul className="space-y-1">
      <li>Bạn sẽ đến cùng {rsvp.soNguoi} người</li>
      <li>{rsvp.gheXeDi > 0 ? `Xe chiều đi: ${rsvp.gheXeDi} ghế` : "Không đi xe chiều đi"}</li>
      <li>{rsvp.gheXeVe > 0 ? `Xe chiều về: ${rsvp.gheXeVe} ghế` : "Không đi xe chiều về"}</li>
    </ul>
  );
}

export function RsvpForm() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { guest, values, errors, status } = state;

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const pendingFocusRef = useRef<RsvpField | null>(null);

  const isSuccess = status.kind === "success";
  useEffect(() => {
    if (isSuccess) successRef.current?.focus();
  }, [isSuccess]);

  // Runs after every commit so it focuses a control only once it is rendered and enabled.
  useEffect(() => {
    const field = pendingFocusRef.current;
    if (!field) return;
    pendingFocusRef.current = null;
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  });

  async function submit() {
    if (!guest || submittingRef.current) return;

    const draft = toRsvpInput(guest.id, values);
    const result = validateRsvp(draft);
    if (!result.ok) {
      pendingFocusRef.current = firstInvalidField(result.errors) ?? null;
      dispatch({ type: "invalid", errors: result.errors });
      return;
    }
    // Narrows the draft to `RsvpInput`; always true once validation passed.
    if (draft.diTiec === undefined) return;

    submittingRef.current = true;
    dispatch({ type: "submit" });
    const response = await submitRsvp(draft);
    submittingRef.current = false;

    if (response.ok) {
      dispatch({ type: "succeeded", rsvp: response.data.rsvp ?? result.value.rsvp });
      return;
    }
    if (response.fields) {
      pendingFocusRef.current = firstInvalidField(response.fields) ?? null;
    }
    dispatch({ type: "failed", message: response.message, fields: response.fields });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (!guest) {
    return <GuestLookup onSelect={(selected) => dispatch({ type: "select", guest: selected })} />;
  }

  if (status.kind === "success") {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="flex flex-col gap-4 rounded-control bg-lua p-6 text-than"
      >
        <p className="font-serif text-heading text-la-dam">Cảm ơn bạn đã xác nhận!</p>
        <SuccessSummary rsvp={status.rsvp} />
        <button
          type="button"
          onClick={() => dispatch({ type: "edit" })}
          className="self-start rounded-control border border-la-dam px-4 py-2 text-sm font-medium text-la-dam"
        >
          Sửa câu trả lời
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-than">
        <p>
          Bạn đang xác nhận cho: <strong>{guest.ten}</strong>
        </p>
        <button
          type="button"
          onClick={() => dispatch({ type: "changeGuest" })}
          disabled={submitting}
          className="text-sm font-medium text-la-dam underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Đổi người
        </button>
      </div>

      <RsvpFields
        values={values}
        onChange={(next) => dispatch({ type: "change", values: next })}
        errors={errors}
        disabled={submitting}
      />

      {status.kind === "error" ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm font-medium text-than">
            {status.message}
          </p>
          {status.canRetry ? (
            <button
              type="button"
              onClick={() => void submit()}
              className="self-start rounded-control border border-la-dam px-4 py-2 text-sm font-medium text-la-dam"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        className="min-h-11 w-full rounded-control bg-la-dam px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang gửi…" : "Gửi xác nhận"}
      </button>
    </form>
  );
}
