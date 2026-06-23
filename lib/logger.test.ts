import { afterEach, describe, expect, it } from "vitest";
import { log, __setSinkForTests } from "./logger";

describe("logger", () => {
  // Capture emitted JSON per test. Use an array so we can assert on
  // every call individually.
  const captured: { level: string; line: string }[] = [];
  const sink = (level: "info" | "warn" | "error", line: string) => {
    captured.push({ level, line });
  };

  afterEach(() => {
    captured.length = 0;
    __setSinkForTests(null);
  });

  it("emits a single JSON line per call with `t`, `level`, and `msg`", () => {
    __setSinkForTests(sink);
    log.info("hello");

    expect(captured).toHaveLength(1);
    const parsed = JSON.parse(captured[0].line);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(parsed.t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("routes errors through the same JSON shape", () => {
    __setSinkForTests(sink);
    log.error("boom", { code: 500 });
    expect(captured).toHaveLength(1);
    const parsed = JSON.parse(captured[0].line);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("boom");
    expect(parsed.code).toBe(500);
  });

  it("warns with level=warn", () => {
    __setSinkForTests(sink);
    log.warn("be careful");
    expect(captured[0].level).toBe("warn");
  });

  it("merges extras at the top level (not nested under `extra`)", () => {
    __setSinkForTests(sink);
    log.error("verify_failed", { reference: "abc", orderId: "xyz" });
    const parsed = JSON.parse(captured[0].line);
    expect(parsed.reference).toBe("abc");
    expect(parsed.orderId).toBe("xyz");
  });

  it("ignores undefined extras without throwing", () => {
    __setSinkForTests(sink);
    expect(() => log.info("plain")).not.toThrow();
  });
});