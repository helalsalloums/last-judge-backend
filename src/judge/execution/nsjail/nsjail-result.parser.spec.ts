import { NsJailResultParser } from "./nsjail-result.parser";
import { ProcessResult } from "../execution-engine.interface";

describe("NsJailResultParser", () => {
  const parser = new NsJailResultParser();

  const baseResult: ProcessResult = {
    stdout: "",
    stderr: "",
    exitCode: 0,
    signal: null,
    timedOut: false,
    durationMs: 1,
  };

  it("classifies success", () => {
    expect(parser.classify(baseResult)).toBe("SUCCESS");
  });

  it("classifies TLE from NsJail stderr", () => {
    expect(
      parser.classify({
        ...baseResult,
        exitCode: 137,
        stderr: "pid=12 run time >= time limit (2 >= 1). Killing it",
      }),
    ).toBe("TIME_LIMIT_EXCEEDED");
  });

  it("classifies MLE from memory stderr", () => {
    expect(
      parser.classify({
        ...baseResult,
        exitCode: 134,
        stderr: "terminate called after throwing an instance of 'std::bad_alloc'",
      }),
    ).toBe("MEMORY_LIMIT_EXCEEDED");
  });

  it("classifies sandbox errors", () => {
    expect(
      parser.classify({
        ...baseResult,
        exitCode: 255,
      }),
    ).toBe("SANDBOX_ERROR");
  });

  it("classifies generic runtime errors", () => {
    expect(
      parser.classify({
        ...baseResult,
        exitCode: 1,
      }),
    ).toBe("RUNTIME_ERROR");
  });
});
