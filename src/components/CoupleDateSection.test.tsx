import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { CoupleDateSection } from "./CoupleDateSection";

describe("CoupleDateSection", () => {
  it("renders the couple names as a level-1 heading that reads naturally", () => {
    render(<CoupleDateSection />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Minh Phi và Mỹ Ngân" }),
    ).toBeInTheDocument();
  });

  it("renders the solar date and time inside a time element with the event instant", () => {
    render(<CoupleDateSection />);

    const time = screen.getByText(
      (_, element) =>
        element?.tagName === "TIME" &&
        element.textContent === `${siteConfig.dateText} lúc ${siteConfig.timeText}`,
    );
    expect(time).toHaveAttribute("dateTime", "2027-01-17T14:00:00+07:00");
    expect(time).toHaveTextContent("Chủ nhật, 17.01.2027");
  });

  it("renders the lunar date line", () => {
    render(<CoupleDateSection />);

    expect(
      screen.getByText("Nhằm ngày 10 tháng Chạp năm Bính Ngọ"),
    ).toBeInTheDocument();
  });
});
