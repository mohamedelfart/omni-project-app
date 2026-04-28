import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlaBreachService } from './sla-breach.service';

/**
 * Low-frequency background scan (default 10 minutes). Disable with SLA_BREACH_SCAN_ENABLED=false.
 */
@Injectable()
export class SlaBreachScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaBreachScheduler.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly slaBreachService: SlaBreachService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('SLA_BREACH_SCAN_ENABLED')?.toLowerCase() !== 'false';
    if (!enabled) {
      this.logger.log('SLA breach scan disabled (SLA_BREACH_SCAN_ENABLED=false)');
      return;
    }

    const intervalMs = Number(this.configService.get<string>('SLA_BREACH_SCAN_INTERVAL_MS') ?? 600_000);
    const safeMs = Number.isFinite(intervalMs) && intervalMs >= 60_000 ? intervalMs : 600_000;

    this.intervalHandle = setInterval(() => {
      void this.slaBreachService
        .scanOpenRequests(50)
        .then(({ examined, updated }) => {
          if (examined > 0) {
            this.logger.debug(`SLA breach scan examined=${examined} updated=${updated}`);
          }
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`SLA breach scan failed: ${message}`);
        });
    }, safeMs);

    this.logger.log(`SLA breach scan scheduled every ${safeMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}
