import { Injectable } from "@nestjs/common";
import { mkdir, rm } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";

export interface Workspace {
  rootDir: string;
  sourceFile: string;
  executableFile: string;
  stdinFile: string;
  stdoutFile: string;
  stderrFile: string;
}

@Injectable()
export class WorkspaceService {
  private readonly baseDir = "/tmp/turbo-judge";

  async create(submissionId: number): Promise<Workspace> {
    const rootDir = join(this.baseDir, `submission-${submissionId}-${randomUUID()}`);

    await mkdir(rootDir, { recursive: true });

    return {
      rootDir,
      sourceFile: join(rootDir, "main.src"),
      executableFile: join(rootDir, "main.out"),
      stdinFile: join(rootDir, "stdin.txt"),
      stdoutFile: join(rootDir, "stdout.txt"),
      stderrFile: join(rootDir, "stderr.txt"),
    };
  }

  async cleanup(workspace: Workspace): Promise<void> {
    await rm(workspace.rootDir, { recursive: true, force: true });
  }
}
