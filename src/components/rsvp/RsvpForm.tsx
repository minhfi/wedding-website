"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getGuest, submitRsvp } from "@/lib/api-client";
import { validateRsvp, type RsvpErrors, type RsvpField } from "@/lib/rsvp-validation";
import type { GuestDetail, GuestSuggestion, Rsvp } from "@/lib/types";
import { GuestLookup } from "./GuestLookup";
import { EMPTY_RSVP_VALUES, RsvpFields, toRsvpInput, type RsvpFormValues } from "./RsvpFields";

type Status =
  | { kind: "loading" }
  | { kind: "loadError"; message: string }
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "success"; rsvp: Rsvp }
  | { kind: "error"; message: string; canRetry: boolean };

/** The guest's saved answer, shown as a note above the pre-filled form. */
interface PreviousAnswer {
  capNhatLuc: string | null;
}

interface State {
  guest: GuestSuggestion | null;
  previous: PreviousAnswer | null;
  values: RsvpFormValues;
  errors: RsvpErrors;
  status: Status;
}

type Action =
  | { type: "select"; guest: GuestSuggestion }
  | { type: "changeGuest" }
  | { type: "retryLoad" }
  | { type: "loaded"; detail: GuestDetail }
  | { type: "loadFailed"; message: string }
  | { type: "change"; values: RsvpFormValues }
  | { type: "invalid"; errors: RsvpErrors }
  | { type: "submit" }
  | { type: "succeeded"; rsvp: Rsvp; capNhatLuc: string | null }
  | { type: "failed"; message: string; fields?: RsvpErrors }
  | { type: "edit" };

const EDITING: Status = { kind: "editing" };

const INITIAL_STATE: State = {
  guest: null,
  previous: null,
  values: EMPTY_RSVP_VALUES,
  errors: {},
  status: EDITING,
};

/** Order of the controls on screen, used to focus the first invalid one. */
const FIELD_ORDER = ["diTiec", "soNguoi", "xeDi", "gheXeDi", "xeVe", "gheXeVe"] as const;

const toCountValue = (count: number) => (count > 0 ? String(count) : "");

/** Maps a saved answer back to form values (seat count 0 = not taking that bus). */
function toFormValues(rsvp: Rsvp): RsvpFormValues {
  if (rsvp.diTiec === "khong") return { ...EMPTY_RSVP_VALUES, diTiec: "khong" };
  return {
    diTiec: "co",
    soNguoi: String(rsvp.soNguoi),
    xeDi: rsvp.gheXeDi > 0,
    gheXeDi: toCountValue(rsvp.gheXeDi),
    xeVe: rsvp.gheXeVe > 0,
    gheXeVe: toCountValue(rsvp.gheXeVe),
  };
}

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
      return { ...INITIAL_STATE, guest: action.guest, status: { kind: "loading" } };
    case "changeGuest":
      return INITIAL_STATE;
    case "retryLoad":
      return { ...state, status: { kind: "loading" } };
    case "loaded": {
      const { rsvp, capNhatLuc } = action.detail;
      return rsvp
        ? { ...state, previous: { capNhatLuc }, values: toFormValues(rsvp), status: EDITING }
        : { ...state, previous: null, values: EMPTY_RSVP_VALUES, status: EDITING };
    }
    case "loadFailed":
      return { ...state, status: { kind: "loadError", message: action.message } };
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
      return {
        ...state,
        previous: { capNhatLuc: action.capNhatLuc },
        values: toFormValues(action.rsvp),
        status: { kind: "success", rsvp: action.rsvp },
      };
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

const SHEET_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/;

/** "yyyy-MM-dd HH:mm:ss" → "HH:mm ngày dd/MM/yyyy"; any other value is returned unchanged. */
export function formatConfirmedAt(capNhatLuc: string): string {
  const match = SHEET_TIMESTAMP.exec(capNhatLuc.trim());
  if (!match) return capNhatLuc;
  const [, year, month, day, hour, minute] = match;
  return `${hour}:${minute} ngày ${day}/${month}/${year}`;
}

function previousAnswerNote({ capNhatLuc }: PreviousAnswer): string {
  return capNhatLuc
    ? `Bạn đã xác nhận lúc ${formatConfirmedAt(capNhatLuc)}, có thể sửa lại bên dưới`
    : "Bạn đã xác nhận trước đó, có thể sửa lại bên dưới";
}

const OUTLINE_BUTTON_CLASS =
  "min-h-11 self-start touch-manipulation rounded-control border border-la-dam px-4 py-2 text-body font-medium text-la-dam hover:bg-lua motion-safe:transition-colors";

function SuccessSummary({ rsvp }: { rsvp: Rsvp }) {
  if (rsvp.diTiec === "khong") {
    return <p>Bạn đã báo không đến được. Cảm ơn bạn đã báo cho chúng mình.</p>;
  }
  return (
    <ul className="space-y-1">
      <li>Số người đi tiệc: {rsvp.soNguoi}</li>
      <li>{rsvp.gheXeDi > 0 ? `Xe chiều đi: ${rsvp.gheXeDi} ghế` : "Không đi xe chiều đi"}</li>
      <li>{rsvp.gheXeVe > 0 ? `Xe chiều về: ${rsvp.gheXeVe} ghế` : "Không đi xe chiều về"}</li>
    </ul>
  );
}

export function RsvpForm() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { guest, previous, values, errors, status } = state;

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const guestHeaderRef = useRef<HTMLParagraphElement>(null);
  /** False on first render so the page does not jump to the lookup; true after "Đổi người". */
  const [focusLookup, setFocusLookup] = useState(false);
  const submittingRef = useRef(false);
  /** Bumped on every guest load or guest change; a response for an older id is ignored. */
  const loadIdRef = useRef(0);

  /** What to focus after the next commit: a form field, or the guest header. */
  const pendingFocusRef = useRef<RsvpField | "guestHeader" | null>(null);

  const isSuccess = status.kind === "success";
  useEffect(() => {
    if (isSuccess) successRef.current?.focus();
  }, [isSuccess]);

  // Runs after every commit so it focuses a control only once it is rendered and enabled.
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    if (target === "guestHeader") {
      guestHeaderRef.current?.focus();
      return;
    }
    const form = formRef.current;
    // In a radio group, prefer the checked option (the one Tab would land on).
    const control =
      form?.querySelector<HTMLElement>(`[name="${target}"]:checked`) ??
      form?.querySelector<HTMLElement>(`[name="${target}"]`);
    control?.focus();
  });

  async function loadGuest(selected: GuestSuggestion) {
    const loadId = ++loadIdRef.current;
    const response = await getGuest(selected.id);
    if (loadId !== loadIdRef.current) return;
    if (response.ok) {
      dispatch({ type: "loaded", detail: response.data });
    } else {
      dispatch({ type: "loadFailed", message: response.message });
    }
  }

  function selectGuest(selected: GuestSuggestion) {
    pendingFocusRef.current = "guestHeader";
    dispatch({ type: "select", guest: selected });
    void loadGuest(selected);
  }

  function retryLoad() {
    if (!guest) return;
    dispatch({ type: "retryLoad" });
    void loadGuest(guest);
  }

  function changeGuest() {
    loadIdRef.current += 1;
    setFocusLookup(true);
    dispatch({ type: "changeGuest" });
  }

  function editAnswer() {
    pendingFocusRef.current = "diTiec";
    dispatch({ type: "edit" });
  }

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
      dispatch({
        type: "succeeded",
        rsvp: response.data.rsvp ?? result.value.rsvp,
        capNhatLuc: response.data.capNhatLuc,
      });
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
    return <GuestLookup onSelect={selectGuest} focusOnMount={focusLookup} />;
  }

  if (status.kind === "success") {
    // Focus moves here on success, so no live region is needed (avoids a double announcement).
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="flex flex-col gap-4 rounded-control bg-lua p-6 text-than outline-none"
      >
        <h3 className="font-serif text-heading text-la-dam">Cảm ơn bạn đã xác nhận!</h3>
        <SuccessSummary rsvp={status.rsvp} />
        <button type="button" onClick={editAnswer} className={OUTLINE_BUTTON_CLASS}>
          Sửa câu trả lời
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";
  const loadPhase = status.kind === "loading" || status.kind === "loadError";

  return (
    <div className="flex flex-col gap-6">
      {/* Stays mounted from loading to the form, so focus placed here is kept. It is a
          non-interactive focus target (for screen readers), so it shows no focus ring. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-than">
        <p ref={guestHeaderRef} tabIndex={-1} className="outline-none">
          Bạn đang xác nhận cho: <strong>{guest.ten}</strong>
        </p>
        <button
          type="button"
          onClick={changeGuest}
          disabled={submitting}
          className="inline-flex min-h-11 touch-manipulation items-center text-body font-medium text-la-dam underline underline-offset-4 enabled:hover:text-than motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          Đổi người
        </button>
      </div>

      {loadPhase ? (
        <div className="flex flex-col">
          {/* Live regions stay mounted; only their content changes. */}
          <div role="status" aria-live="polite">
            {status.kind === "loading" ? (
              <p className="inline-flex items-center gap-2 text-body text-da">
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full border-2 border-nu border-t-la-dam motion-safe:animate-spin"
                />
                Đang tải thông tin…
              </p>
            ) : null}
          </div>
          <div role="alert">
            {status.kind === "loadError" ? (
              <p className="text-body font-medium text-than">{status.message}</p>
            ) : null}
          </div>
          {status.kind === "loadError" ? (
            <button type="button" onClick={retryLoad} className={`mt-3 ${OUTLINE_BUTTON_CLASS}`}>
              Thử lại
            </button>
          ) : null}
        </div>
      ) : (
        <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          {previous ? (
            <p className="rounded-control bg-lua px-4 py-3 text-body text-than">
              {previousAnswerNote(previous)}
            </p>
          ) : null}

          <RsvpFields
            values={values}
            onChange={(next) => dispatch({ type: "change", values: next })}
            errors={errors}
            disabled={submitting}
          />

          <div className="flex flex-col">
            {/* Stays mounted; only its content changes. */}
            <div role="alert">
              {status.kind === "error" ? (
                <p
                  className={`text-body font-medium text-than ${status.canRetry ? "mb-3" : "mb-6"}`}
                >
                  {status.message}
                </p>
              ) : null}
            </div>
            {status.kind === "error" && status.canRetry ? (
              <button
                type="button"
                onClick={() => void submit()}
                className={`mb-6 ${OUTLINE_BUTTON_CLASS}`}
              >
                Thử lại
              </button>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting || undefined}
              className="min-h-11 w-full touch-manipulation rounded-control bg-la-dam px-4 py-3 text-base font-medium text-white enabled:hover:bg-than motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang gửi…" : "Gửi xác nhận"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
