import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchBar } from "@/components/search/search-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => ({
    get: vi.fn(() => ""),
  }),
}));

describe("SearchBar", () => {
  it("renders search input", () => {
    render(<SearchBar />);
    const input = screen.getByLabelText("Search");
    expect(input).toBeInTheDocument();
  });

  it("displays initial query", () => {
    render(<SearchBar initialQuery="shoes" />);
    const input = screen.getByLabelText("Search");
    expect(input).toHaveValue("shoes");
  });

  it("shows clear button when query entered", () => {
    render(<SearchBar initialQuery="shoes" />);
    const clearButton = screen.getByRole("button", { name: /clear search/i });
    expect(clearButton).toBeInTheDocument();
  });

  it("hides clear button when empty", () => {
    render(<SearchBar />);
    const clearButton = screen.queryByRole("button", { name: /clear search/i });
    expect(clearButton).not.toBeInTheDocument();
  });
});
