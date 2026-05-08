import { Inject, Injectable } from "@nestjs/common";
import { writeFile } from "fs/promises";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CompileResult,
  ProcessResult,
} from "./execution/execution-engine.interface";
import type { ExecutionEngine } from "./execution/execution-engine.interface";
import { SubmissionStatusService } from "./status/submission-status.service";
import { WorkspaceService } from "./workspace/workspace.service";

type JudgeVerdict = "AC" | "WA" | "TLE" | "MLE" | "CE" | "RE";

@Injectable()
export class JudgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService,
    private readonly submissionStatusService: SubmissionStatusService,
    @Inject("ExecutionEngine")
    private readonly executionEngine: ExecutionEngine,
  ) { }

  async judge(submissionId: number): Promise<JudgeVerdict> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    const [problem, testCases] = await Promise.all([
      this.prisma.problem.findUnique({
        where: { id: submission.problemId },
      }),
      this.prisma.testCase.findMany({
        where: { problemId: submission.problemId },
        orderBy: { id: "asc" },
      }),
    ]);

    if (!problem) {
      throw new Error("Problem not found");
    }

    if (testCases.length === 0) {
      throw new Error("No test cases found");
    }

    const workspace = await this.workspaceService.create(submissionId);

    try {
      await writeFile(workspace.sourceFile, submission.code);

      await this.submissionStatusService.setStatus(submissionId, "Compiling");

      const compileResult = await this.executionEngine.compile({
        workspaceDir: workspace.rootDir,
        sourceFile: workspace.sourceFile,
        outputFile: workspace.executableFile,
        timeLimitMs: 5000,
        memoryLimitMb: 512,
        language: submission.language,
      });

      const compileVerdict = this.evaluateCompileResult(compileResult);
      if (compileVerdict) {
        await this.submissionStatusService.setStatus(submissionId, compileVerdict);
        return compileVerdict;
      }

      for (let i = 0; i < testCases.length; i++) {
        await this.submissionStatusService.setStatus(
          submissionId,
          `Running on test ${i + 1}`,
        );

        const runResult = await this.executionEngine.run({
          workspaceDir: workspace.rootDir,
          executablePath: workspace.executableFile,
          stdin: testCases[i].input,
          timeLimitMs: problem.timeLimit,
          memoryLimitMb: problem.memoryLimit,
          language: submission.language,
        });

        const verdict = this.evaluateRunResult(runResult, testCases[i].output);

        if (verdict !== "AC") {
          await this.submissionStatusService.setStatus(submissionId, verdict);
          return verdict;
        }
      }

      await this.submissionStatusService.setStatus(submissionId, "Accepted");
      return "AC";
    } catch {
      await this.submissionStatusService.setStatus(submissionId, "Runtime Error");
      return "RE";
    } finally {
      await this.workspaceService.cleanup(workspace);
    }
  }

  private evaluateRunResult(
    result: ProcessResult,
    expectedOutput: string,
  ): JudgeVerdict {
    switch (result.terminationReason) {
      case "TIME_LIMIT_EXCEEDED":
        return "TLE";
      case "MEMORY_LIMIT_EXCEEDED":
        return "MLE";
      case "SANDBOX_ERROR":
      case "RUNTIME_ERROR":
        return "RE";
      default:
        break;
    }

    if (result.timedOut) {
      return "TLE";
    }

    if (this.looksLikeMemoryLimitExceeded(result)) {
      return "MLE";
    }

    if (result.exitCode !== 0) {
      return "RE";
    }

    if (!this.outputsMatch(result.stdout, expectedOutput)) {
      return "WA";
    }

    return "AC";
  }

  private evaluateCompileResult(result: CompileResult): JudgeVerdict | null {
    if (result.ok) {
      return null;
    }

    if (result.terminationReason === "TIME_LIMIT_EXCEEDED") {
      return "TLE";
    }

    if (result.terminationReason === "MEMORY_LIMIT_EXCEEDED") {
      return "MLE";
    }

    return "CE";
  }

  private looksLikeMemoryLimitExceeded(result: ProcessResult): boolean {
    const memoryPatterns = [
      /std::bad_alloc/i,
      /bad alloc/i,
      /cannot allocate memory/i,
      /out of memory/i,
      /memory limit/i,
      /ENOMEM/i,
      /oom/i,
    ];

    return memoryPatterns.some((pattern) => pattern.test(result.stderr));
  }

  private outputsMatch(actual: string, expected: string): boolean {
    return actual.trim() === expected.trim();
  }
}
