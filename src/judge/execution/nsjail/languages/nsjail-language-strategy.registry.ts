import { Inject, Injectable } from "@nestjs/common";
import { NSJAIL_CONFIG } from "../nsjail.config";
import type { NsJailConfig } from "../nsjail.config";
import {
  NSJAIL_LANGUAGE_STRATEGIES,
} from "./nsjail-language-strategy.interface";
import type { NsJailLanguageStrategy } from "./nsjail-language-strategy.interface";

@Injectable()
export class NsJailLanguageStrategyRegistry {
  private readonly strategyByLanguage = new Map<string, NsJailLanguageStrategy>();

  constructor(
    @Inject(NSJAIL_LANGUAGE_STRATEGIES)
    strategies: NsJailLanguageStrategy[],
    @Inject(NSJAIL_CONFIG)
    private readonly config: NsJailConfig,
  ) {
    for (const strategy of strategies) {
      this.register(strategy.language, strategy);

      for (const alias of strategy.aliases) {
        this.register(alias, strategy);
      }
    }
  }

  resolve(language: string | undefined): NsJailLanguageStrategy {
    const normalized = this.normalize(language ?? this.config.defaultLanguage);
    const strategy = this.strategyByLanguage.get(normalized);

    if (strategy) {
      return strategy;
    }

    const fallback = this.strategyByLanguage.get(
      this.normalize(this.config.defaultLanguage),
    );

    if (fallback) {
      return fallback;
    }

    throw new Error(`Unsupported language: ${language ?? "unknown"}`);
  }

  private register(language: string, strategy: NsJailLanguageStrategy): void {
    this.strategyByLanguage.set(this.normalize(language), strategy);
  }

  private normalize(language: string): string {
    return language.trim().toLowerCase();
  }
}
