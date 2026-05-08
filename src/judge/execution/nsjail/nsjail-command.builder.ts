import { Inject, Injectable } from "@nestjs/common";
import {
  CompileRequest,
  RunRequest,
} from "../execution-engine.interface";

import { NSJAIL_CONFIG } from "./nsjail.config";
import type { NsJailConfig } from "./nsjail.config";
import { NsJailLanguageStrategyRegistry } from "./languages/nsjail-language-strategy.registry";
import { NsJailProgramCommand } from "./languages/nsjail-language-strategy.interface";

@Injectable()
export class NsJailCommandBuilder {
  constructor(
    @Inject(NSJAIL_CONFIG)
    private readonly config: NsJailConfig,
    private readonly languageRegistry: NsJailLanguageStrategyRegistry,
  ) { }

  buildCompileCommand(
    req: CompileRequest,
  ): { command: string; args: string[] } | null {
    const languageStrategy = this.languageRegistry.resolve(req.language);
    const program = languageStrategy.buildCompileProgram(req);

    if (!program) {
      return null;
    }

    return this.wrapWithNsJail(req.workspaceDir, req.timeLimitMs, req.memoryLimitMb, program);
  }

  buildRunCommand(req: RunRequest): { command: string; args: string[] } {
    const languageStrategy = this.languageRegistry.resolve(req.language);
    const program = languageStrategy.buildRunProgram(req);

    return this.wrapWithNsJail(req.workspaceDir, req.timeLimitMs, req.memoryLimitMb, program);
  }

  private wrapWithNsJail(
    workspaceDir: string,
    timeLimitMs: number,
    memoryLimitMb: number,
    program: NsJailProgramCommand,
  ): { command: string; args: string[] } {
    const args = this.buildBaseArgs(
      workspaceDir,
      timeLimitMs,
      memoryLimitMb,
    );
    args.push("--", program.command, ...program.args);

    return {
      command: this.config.binaryPath,
      args,
    };
  }

  private buildBaseArgs(
    workspaceDir: string,
    timeLimitMs: number,
    memoryLimitMb: number,
  ): string[] {
    const timeLimitSec = Math.max(1, Math.ceil(timeLimitMs / 1000));

    const args = [
      "--mode",
      "o",
      "--cwd",
      workspaceDir,
      "--time_limit",
      String(timeLimitSec),
      "--rlimit_as",
      String(memoryLimitMb),
      "--max_cpus",
      "1",
      "--user",
      String(this.config.uid),
      "--group",
      String(this.config.gid),
    ];

    if (this.config.disableNetwork) {
      args.push("--disable_clone_newnet");
    }

    return args;
  }
}
