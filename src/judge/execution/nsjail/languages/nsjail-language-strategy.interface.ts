import { CompileRequest, RunRequest } from "../../execution-engine.interface";

export interface NsJailProgramCommand {
  command: string;
  args: string[];
}

export interface NsJailLanguageStrategy {
  readonly language: string;
  readonly aliases: readonly string[];

  buildCompileProgram(req: CompileRequest): NsJailProgramCommand | null;
  buildRunProgram(req: RunRequest): NsJailProgramCommand;
}

export const NSJAIL_LANGUAGE_STRATEGIES = Symbol("NSJAIL_LANGUAGE_STRATEGIES");
