import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Socket } from "node:net";

import type { EchoDto } from "./dto/echo.dto.js";

type HealthCheckStatus = "ok" | "error";
type HealthOverallStatus = "ok" | "degraded";

type HealthCheckResult = {
  status: HealthCheckStatus;
  message?: string;
};

type HealthChecks = {
  api: HealthCheckResult;
  database: HealthCheckResult;
  redis: HealthCheckResult;
};

type HealthPayload = {
  checks: HealthChecks;
  status: HealthOverallStatus;
  timestamp: string;
  version: string;
};

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getRootPayload() {
    return {
      name: "tabletop-booking-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    };
  }

  echo(body: EchoDto) {
    return {
      message: body.message,
      repeat: body.repeat ?? 1
    };
  }

  async getHealthPayload(): Promise<HealthPayload> {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    const redisUrl = this.configService.get<string>("REDIS_URL");
    const [database, redis] = await Promise.all([
      this.checkTcpDependency(databaseUrl, 5432),
      this.checkTcpDependency(redisUrl, 6379)
    ]);
    const status: HealthOverallStatus =
      database.status === "ok" && redis.status === "ok" ? "ok" : "degraded";

    return {
      checks: {
        api: {
          status: "ok"
        },
        database,
        redis
      },
      status,
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    };
  }

  private async checkTcpDependency(
    connectionUrl: string | undefined,
    fallbackPort: number
  ): Promise<HealthCheckResult> {
    if (!connectionUrl) {
      return {
        message: "not_configured",
        status: "error"
      };
    }

    try {
      const parsed = new URL(connectionUrl);
      const port = parsed.port.length > 0 ? Number(parsed.port) : fallbackPort;
      if (Number.isNaN(port)) {
        return {
          message: "invalid_config",
          status: "error"
        };
      }

      await this.withTimeout(this.connectSocket(parsed.hostname, port), 1500);
      return {
        status: "ok"
      };
    } catch {
      return {
        message: "unavailable",
        status: "error"
      };
    }
  }

  private async connectSocket(host: string, port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();

      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        reject(new Error("timeout"));
      });
      socket.once("error", (error: Error) => {
        socket.destroy();
        reject(error);
      });

      socket.setTimeout(1200);
      socket.connect(port, host);
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), timeoutMs);
      })
    ]);
  }
}
