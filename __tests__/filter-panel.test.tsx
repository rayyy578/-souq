import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Create mutable mock references
const mockGet = vi.fn((_key: string) => null);
const mockToString = vi.fn(() => "");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/search",
  useSearchParams: () => ({
    get: mockGet,
    toString: mockToString,
  }),
}));

import { FilterPanel } from "@/components/search/filter-panel";

beforeEach(() => {
  mockGet.mockImplementation((_key: string) => null);
  mockToString.mockImplementation(() => "");
  vi.clearAllMocks();
});

describe("FilterPanel", () => {
  it("renders all filter sections - Price", () => {
    render(<FilterPanel />);
    expect(screen.getByText("Price")).toBeInTheDocument();
  });

  it("renders all filter sections - Rating", () => {
    render(<FilterPanel />);
    expect(screen.getByText("Rating")).toBeInTheDocument();
  });

  it("renders all filter sections - Category", () => {
    render(<FilterPanel categories={["Electronics", "Books"]} />);
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  it("renders all filter sections - Availability", () => {
    render(<FilterPanel />);
    expect(screen.getByText("Availability")).toBeInTheDocument();
  });

  it("shows in stock checkbox", () => {
    render(<FilterPanel />);
    expect(
      screen.getByRole("checkbox", { name: /in stock only/i }),
    ).toBeInTheDocument();
  });

  it("shows clear all when filters active", () => {
    mockGet.mockImplementation((key: string) => (key === "minPrice" ? "100" : null));
    mockToString.mockImplementation(() => "minPrice=100");

    render(<FilterPanel />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });
});
