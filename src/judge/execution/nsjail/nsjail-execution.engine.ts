import { Inject, Injectable } from "@nestjs/common";
import { spawn } from "child_process";
import {
  CompileResult,
  ProcessResult,
} from "../execution-engine.interface";
import type { ExecutionEngine } from "../execution-engine.interface";
import { NsJailCommandBuilder } from "./nsjail-command.builder";
import { NSJAIL_CONFIG } from "./nsjail.config";
import type { NsJailConfig } from "./nsjail.config";
import { NsJailResultParser } from "./nsjail-result.parser";

@Injectable()
export class NsJailExecutionEngine implements ExecutionEngine {
  constructor(
    private readonly builder: NsJailCommandBuilder,
    private readonly resultParser: NsJailResultParser,
    @Inject(NSJAIL_CONFIG)
    private readonly config: NsJailConfig,
  ) { }

  async compile(req: Parameters<ExecutionEngine["compile"]>[0]): Promise<CompileResult> {
    const commandSpec = this.builder.buildCompileCommand(req);

    if (!commandSpec) {
      return {
        stdout: "",
        stderr: "",
        exitCode: 0,
        signal: null,
        timedOut: false,
        durationMs: 0,
        terminationReason: "SUCCESS",
        ok: true,
      };
    }

    const result = await this.spawnAndCollect(commandSpec.command, commandSpec.args, undefined, req.timeLimitMs);
    const terminationReason = this.resultParser.classify(result);

    return {
      ...result,
      terminationReason,
      ok: terminationReason === "SUCCESS",
    };
  }

  async run(req: Parameters<ExecutionEngine["run"]>[0]): Promise<ProcessResult> {
    const { command, args } = this.builder.buildRunCommand(req);
    const result = await this.spawnAndCollect(
      command,
      args,
      req.stdin,
      req.timeLimitMs,
    );

    return {
      ...result,
      terminationReason: this.resultParser.classify(result),
    };
  }

  private async spawnAndCollect(
    command: string,
    args: string[],
    stdin: string | undefined,
    timeoutMs: number,
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const watchdogMs = Math.max(timeoutMs + this.config.watchdogGraceMs, 3000);

      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;

      const finish = (result: ProcessResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on("error", (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
      }, watchdogMs);

      proc.stdin.on("error", () => {
        // Input pipe can close early when child exits; this is expected.
      });

      if (stdin !== undefined) {
        proc.stdin.write(stdin);
      }
      proc.stdin.end();

      proc.on("close", (exitCode, signal) => {
        clearTimeout(timer);

        finish({
          stdout,
          stderr,
          exitCode,
          signal,
          timedOut,
          durationMs: Date.now() - startedAt,
        });
      });
    });
  }
}
