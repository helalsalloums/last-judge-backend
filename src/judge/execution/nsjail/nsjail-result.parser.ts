import { Injectable } from "@nestjs/common";
import {
  ProcessResult,
  ProcessTerminationReason,
} from "../execution-engine.interface";

@Injectable()
export class NsJailResultParser {
  private readonly timeLimitPatterns = [
    /run time >= time limit/i,
    /time limit/i,
    /SIGXCPU/i,
  ];

  private readonly memoryLimitPatterns = [
    /std::bad_alloc/i,
    /bad alloc/i,
    /cannot allocate memory/i,
    /out of memory/i,
    /memory limit/i,
    /ENOMEM/i,
    /oom/i,
  ];

  private readonly sandboxErrorPatterns = [
    /couldn't launch the child process/i,
    /couldn't execute/i,
    /failed to execute/i,
    /error.*nsjail/i,
  ];

  classify(result: ProcessResult): ProcessTerminationReason {
    if (this.isSuccess(result)) {
      return "SUCCESS";
    }

    if (this.isTimeLimitExceeded(result)) {
      return "TIME_LIMIT_EXCEEDED";
    }

    if (this.isMemoryLimitExceeded(result)) {
      return "MEMORY_LIMIT_EXCEEDED";
    }

    if (this.isSandboxError(result)) {
      return "SANDBOX_ERROR";
    }

    return "RUNTIME_ERROR";
  }

  private isSuccess(result: ProcessResult): boolean {
    return !result.timedOut && result.exitCode === 0;
  }

  private isTimeLimitExceeded(result: ProcessResult): boolean {
    if (result.timedOut) {
      return true;
    }

    if (result.signal === "SIGXCPU" || result.exitCode === 128 + 24) {
      return true;
    }

    if (this.matchesAny(result.stderr, this.timeLimitPatterns)) {
      return true;
    }

    if (
      (result.signal === "SIGKILL" || result.exitCode === 128 + 9) &&
      !this.matchesAny(result.stderr, this.memoryLimitPatterns)
    ) {
      return true;
    }

    return false;
  }

  private isMemoryLimitExceeded(result: ProcessResult): boolean {
    if (this.matchesAny(result.stderr, this.memoryLimitPatterns)) {
      return true;
    }

    const terminatedByMemoryLikeSignal =
      result.signal === "SIGSEGV" ||
      result.signal === "SIGABRT" ||
      result.exitCode === 128 + 11 ||
      result.exitCode === 128 + 6;

    return (
      terminatedByMemoryLikeSignal &&
      this.matchesAny(result.stderr, [
        /terminated with signal/i,
        /killed by signal/i,
        /allocation/i,
      ])
    );
  }

  private isSandboxError(result: ProcessResult): boolean {
    if (result.exitCode === 0xff) {
      return true;
    }

    return this.matchesAny(result.stderr, this.sandboxErrorPatterns);
  }

  private matchesAny(value: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(value));
  }
}
