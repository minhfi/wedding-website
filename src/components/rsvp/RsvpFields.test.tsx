import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { validateRsvp, type RsvpErrors } from "@/lib/rsvp-validation";
import {
  EMPTY_RSVP_VALUES,
  RsvpFields,
  toRsvpInput,
  type RsvpFormValues,
} from "./RsvpFields";

const attendingValues: RsvpFormValues = {
  diTiec: "co",
  soNguoi: "3",
  xeDi: true,
  gheXeDi: "2",
  xeVe: false,
  gheXeVe: "",
};

function Harness({
  initial = EMPTY_RSVP_VALUES,
  errors,
  disabled,
  onChange,
}: {
  initial?: RsvpFormValues;
  errors?: RsvpErrors;
  disabled?: boolean;
  onChange?: (values: RsvpFormValues) => void;
}) {
  const [values, setValues] = useState(initial);
  return (
    <RsvpFields
      values={values}
      errors={errors}
      disabled={disabled}
      onChange={(next) => {
        setValues(next);
        onChange?.(next);
      }}
    />
  );
}

describe("RsvpFields", () => {
  it("asks whether the guest attends, with two labelled choices", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Bạn có đến dự tiệc không?" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Không đến được" })).not.toBeChecked();
  });

  it("hides people and bus fields until 'Có' is chosen", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByLabelText("Số người đi tiệc")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /Đi xe khách chiều đi/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Có, mình sẽ đến" }));

    const people = screen.getByLabelText("Số người đi tiệc");
    expect(people).toHaveAttribute("type", "number");
    expect(people).toHaveAttribute("inputmode", "numeric");
    expect(people).toHaveAttribute("min", "1");
    expect(people).toHaveAttribute("max", "10");
    expect(people).toHaveAttribute("step", "1");
    expect(screen.getByRole("radiogroup", { name: /Đi xe khách chiều đi/ })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Đi xe khách chiều về/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Số ghế chiều đi")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Số ghế chiều về")).not.toBeInTheDocument();
  });

  it("keeps fields hidden when 'Không đến được' is chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Không đến được" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RSVP_VALUES, diTiec: "khong" });
    expect(screen.queryByLabelText("Số người đi tiệc")).not.toBeInTheDocument();
  });

  it("shows a direction's seat field only when that direction is 'Có'", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ...EMPTY_RSVP_VALUES, diTiec: "co" }} />);
    const outbound = screen.getByRole("radiogroup", { name: /Đi xe khách chiều đi/ });
    await user.click(screen.getAllByRole("radio", { name: "Có" })[0]);
    expect(outbound).toBeInTheDocument();
    const seats = screen.getByLabelText("Số ghế chiều đi");
    expect(seats).toHaveAttribute("min", "1");
    expect(seats).toHaveAttribute("max", "10");
    expect(screen.queryByLabelText("Số ghế chiều về")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("radio", { name: "Có" })[1]);
    expect(screen.getByLabelText("Số ghế chiều về")).toBeInTheDocument();
  });

  it("explains that pickup details are shown elsewhere", () => {
    render(<Harness initial={{ ...EMPTY_RSVP_VALUES, diTiec: "co" }} />);
    const outbound = screen.getByRole("radiogroup", { name: /Đi xe khách chiều đi/ });
    expect(outbound).toHaveAccessibleDescription(/điểm đón/i);
  });

  it("reports typed values through onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={{ ...EMPTY_RSVP_VALUES, diTiec: "co" }} onChange={onChange} />);
    await user.type(screen.getByLabelText("Số người đi tiệc"), "4");
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_RSVP_VALUES,
      diTiec: "co",
      soNguoi: "4",
    });
  });

  it("clears a direction's seats when it is switched to 'Không'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness
        initial={{ ...attendingValues, xeVe: true, gheXeVe: "1" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getAllByRole("radio", { name: "Không" })[0]);
    expect(onChange).toHaveBeenLastCalledWith({
      ...attendingValues,
      xeDi: false,
      gheXeDi: "",
      xeVe: true,
      gheXeVe: "1",
    });
    expect(screen.queryByLabelText("Số ghế chiều đi")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("radio", { name: "Có" })[0]);
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveValue(null);
  });

  it("clears people and bus answers when switched to 'Không đến được'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={attendingValues} onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Không đến được" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RSVP_VALUES, diTiec: "khong" });
  });

  it("shows field errors linked via aria-describedby and aria-invalid", () => {
    const errors: RsvpErrors = {
      soNguoi: "Số người đi tiệc phải từ 1 đến 10",
      gheXeDi: "Số ghế không được nhiều hơn số người đi tiệc",
      xeVe: "Vui lòng chọn có đi xe hay không",
    };
    render(<Harness initial={{ ...attendingValues, xeVe: null }} errors={errors} />);

    const people = screen.getByLabelText("Số người đi tiệc");
    expect(people).toHaveAttribute("aria-invalid", "true");
    expect(people).toHaveAccessibleDescription(errors.soNguoi);
    expect(document.getElementById("soNguoi-error")).toHaveTextContent(errors.soNguoi ?? "");

    const seats = screen.getByLabelText("Số ghế chiều đi");
    expect(seats).toHaveAttribute("aria-invalid", "true");
    expect(seats).toHaveAccessibleDescription(errors.gheXeDi);

    const returnGroup = screen.getByRole("radiogroup", { name: /Đi xe khách chiều về/ });
    expect(returnGroup).toHaveAttribute("aria-invalid", "true");
    expect(returnGroup).toHaveAccessibleDescription(errors.xeVe);
    for (const radio of [
      screen.getAllByRole("radio", { name: "Có" })[1],
      screen.getAllByRole("radio", { name: "Không" })[1],
    ]) {
      expect(radio).toHaveAccessibleDescription(errors.xeVe);
    }

    const outboundGroup = screen.getByRole("radiogroup", { name: /Đi xe khách chiều đi/ });
    expect(outboundGroup).not.toHaveAttribute("aria-invalid");
  });

  it("shows the attendance error on the attendance choices", () => {
    render(<Harness errors={{ diTiec: "Vui lòng chọn có đi tiệc hay không" }} />);
    const group = screen.getByRole("radiogroup", { name: "Bạn có đến dự tiệc không?" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("radio", { name: "Có, mình sẽ đến" })).toHaveAccessibleDescription(
      "Vui lòng chọn có đi tiệc hay không",
    );
  });

  it("marks fields valid when there are no errors", () => {
    render(<Harness initial={attendingValues} />);
    expect(screen.getByLabelText("Số người đi tiệc")).not.toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("soNguoi-error")).not.toBeInTheDocument();
  });

  it("shows a seats-over-people error from validateRsvp when people is reduced", async () => {
    const user = userEvent.setup();
    function Validating() {
      const [values, setValues] = useState<RsvpFormValues>(attendingValues);
      const result = validateRsvp(toRsvpInput("K001", values));
      return (
        <RsvpFields
          values={values}
          onChange={setValues}
          errors={result.ok ? undefined : result.errors}
        />
      );
    }
    render(<Validating />);
    const people = screen.getByLabelText("Số người đi tiệc");
    await user.clear(people);
    await user.type(people, "1");
    expect(screen.getByLabelText("Số ghế chiều đi")).toHaveAccessibleDescription(
      "Số ghế không được nhiều hơn số người đi tiệc",
    );
  });

  it("disables every control when disabled", () => {
    render(<Harness initial={{ ...attendingValues, xeVe: true }} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    for (const input of screen.getAllByRole("spinbutton")) {
      expect(input).toBeDisabled();
    }
  });
});

describe("toRsvpInput", () => {
  it("converts attending values to numbers", () => {
    expect(toRsvpInput("K001", attendingValues)).toEqual({
      guestId: "K001",
      diTiec: "co",
      soNguoi: 3,
      xeDi: true,
      gheXeDi: 2,
      xeVe: false,
    });
  });

  it("omits people and bus fields when not attending", () => {
    expect(toRsvpInput("K001", { ...attendingValues, diTiec: "khong" })).toEqual({
      guestId: "K001",
      diTiec: "khong",
    });
  });

  it("maps empty numbers and unanswered questions to undefined", () => {
    const input = toRsvpInput("K001", {
      diTiec: "co",
      soNguoi: " ",
      xeDi: true,
      gheXeDi: "",
      xeVe: null,
      gheXeVe: "",
    });
    expect(input).toEqual({ guestId: "K001", diTiec: "co", xeDi: true });
    const result = validateRsvp(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["gheXeDi", "soNguoi", "xeVe"]);
    }
  });

  it("maps non-numeric text to NaN so the validator flags it", () => {
    const input = toRsvpInput("K001", { ...attendingValues, soNguoi: "abc" });
    expect(input).toMatchObject({ soNguoi: Number.NaN });
    expect(validateRsvp(input).ok).toBe(false);
  });

  it("omits diTiec when unanswered so the validator asks for it", () => {
    const input = toRsvpInput("K001", EMPTY_RSVP_VALUES);
    expect(input).toEqual({ guestId: "K001" });
    const result = validateRsvp(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.diTiec).toBeDefined();
    }
  });

  it("produces input accepted by validateRsvp for a valid form", () => {
    expect(validateRsvp(toRsvpInput("K001", attendingValues))).toEqual({
      ok: true,
      value: {
        guestId: "K001",
        rsvp: { diTiec: "co", soNguoi: 3, gheXeDi: 2, gheXeVe: 0 },
      },
    });
  });
});
