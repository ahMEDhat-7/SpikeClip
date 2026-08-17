import { render, screen } from "@testing-library/react";
import { Footer } from "@/presentation/components/layout/Footer";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Footer", () => {
  it("renders copyright notice", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeTruthy();
  });

  it("renders feature link", () => {
    render(<Footer />);
    expect(screen.getByText("Features")).toBeTruthy();
  });

  it("renders pricing link", () => {
    render(<Footer />);
    expect(screen.getByText("Pricing")).toBeTruthy();
  });

  it("renders about link", () => {
    render(<Footer />);
    expect(screen.getByText("About")).toBeTruthy();
  });

  it("renders terms link", () => {
    render(<Footer />);
    expect(screen.getByText("Terms")).toBeTruthy();
  });

  it("renders privacy link", () => {
    render(<Footer />);
    expect(screen.getByText("Privacy")).toBeTruthy();
  });

  it("renders logo", () => {
    render(<Footer />);
    expect(screen.getByText("Clutch")).toBeTruthy();
  });
});
