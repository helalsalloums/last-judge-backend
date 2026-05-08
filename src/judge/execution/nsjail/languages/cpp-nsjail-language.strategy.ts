import { Injectable } from "@nestjs/common";
import { CompileRequest, RunRequest } from "../../execution-engine.interface";
import {
  NsJailLanguageStrategy,
  NsJailProgramCommand,
} from "./nsjail-language-strategy.interface";

@Injectable()
export class CppNsJailLanguageStrategy implements NsJailLanguageStrategy {
  readonly language = "cpp";
  readonly aliases = ["c++", "cpp17", "cxx", "gnu++17"] as const;

  buildCompileProgram(req: CompileRequest): NsJailProgramCommand {
    return {
      command: "/usr/bin/g++",
      args: ["-x", "c++", req.sourceFile, "-O2", "-std=c++17", "-o", req.outputFile],
    };
  }

  buildRunProgram(req: RunRequest): NsJailProgramCommand {
    return {
      command: req.executablePath,
      args: [],
    };
  }
}
