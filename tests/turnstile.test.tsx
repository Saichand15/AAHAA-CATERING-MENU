// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Turnstile } from "../src/components/turnstile";

vi.mock("next/script", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  delete window.turnstile;
  vi.unstubAllEnvs();
});

describe("phone-sized spam protection", () => {
  it("uses a compact widget and preserves verification, expiry and cleanup", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    const renderWidget = vi.fn<NonNullable<Window["turnstile"]>["render"]>(() => "widget");
    const removeWidget = vi.fn();
    window.turnstile = { render: renderWidget, remove: removeWidget };
    const onToken = vi.fn();
    const { unmount } = render(<Turnstile onToken={onToken} />);
    const [container, options] = renderWidget.mock.calls[0];
    expect(container.className).toBe("captcha-container");
    expect(options.size).toBe("compact");
    act(() => options.callback("verified-token"));
    expect(onToken).toHaveBeenLastCalledWith("verified-token");
    act(() => options["expired-callback"]());
    expect(onToken).toHaveBeenLastCalledWith("");
    unmount();
    expect(removeWidget).toHaveBeenCalledWith("widget");
  });

  it("clears verification and shows an explicit error on widget failure", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    const renderWidget = vi.fn<NonNullable<Window["turnstile"]>["render"]>(() => "widget");
    window.turnstile = { render: renderWidget, remove: vi.fn() };
    const onToken = vi.fn();
    render(<Turnstile onToken={onToken} />);
    act(() => renderWidget.mock.calls[0][1]["error-callback"]());
    expect(onToken).toHaveBeenCalledWith("");
    expect(screen.getByRole("alert").textContent).toContain("Spam protection could not load");
  });
});
