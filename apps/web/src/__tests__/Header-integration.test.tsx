import { render, screen } from "@testing-library/react";
import { Header } from "@/presentation/components/layout/Header";

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("@/application/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    logout: jest.fn(),
  }),
}));

describe("Header", () => {
  it("renders logo", () => {
    render(<Header />);
    expect(screen.getByText("Clutch")).toBeTruthy();
  });

  it("renders Sign In and Sign Up when not authenticated", () => {
    render(<Header />);
    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sign Up").length).toBeGreaterThanOrEqual(1);
  });

  it("renders navigation links", () => {
    render(<Header />);
    expect(screen.getAllByText("Features").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pricing").length).toBeGreaterThanOrEqual(1);
  });

  it("renders theme toggle", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeTruthy();
  });

  it("renders mobile menu toggle", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: /toggle menu/i })).toBeTruthy();
  });
});
