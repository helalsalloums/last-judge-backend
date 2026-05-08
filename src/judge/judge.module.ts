import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { JudgeService } from "./judge.service";
import { SubmissionGateway } from "./submission.gateway";
import { WorkspaceService } from "./workspace/workspace.service";
import { SubmissionStatusService } from "./status/submission-status.service";
import { NSJAIL_CONFIG, nsjailConfig } from "./execution/nsjail/nsjail.config";
import { NsJailCommandBuilder } from "./execution/nsjail/nsjail-command.builder";
import { NsJailExecutionEngine } from "./execution/nsjail/nsjail-execution.engine";
import { NsJailResultParser } from "./execution/nsjail/nsjail-result.parser";
import { CppNsJailLanguageStrategy } from "./execution/nsjail/languages/cpp-nsjail-language.strategy";
import { NsJailLanguageStrategyRegistry } from "./execution/nsjail/languages/nsjail-language-strategy.registry";
import { NSJAIL_LANGUAGE_STRATEGIES } from "./execution/nsjail/languages/nsjail-language-strategy.interface";

@Module({
  providers: [
    JudgeService,
    PrismaService,
    SubmissionGateway,
    WorkspaceService,
    SubmissionStatusService,
    CppNsJailLanguageStrategy,
    {
      provide: NSJAIL_LANGUAGE_STRATEGIES,
      useFactory: (cppStrategy: CppNsJailLanguageStrategy) => [cppStrategy],
      inject: [CppNsJailLanguageStrategy],
    },
    NsJailLanguageStrategyRegistry,
    NsJailCommandBuilder,
    NsJailResultParser,
    NsJailExecutionEngine,
    {
      provide: NSJAIL_CONFIG,
      useValue: nsjailConfig,
    },
    {
      provide: "ExecutionEngine",
      useExisting: NsJailExecutionEngine,
    },
  ],
  exports: [JudgeService],
})
export class JudgeModule { }
