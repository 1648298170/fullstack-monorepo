import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 雪花 ID 生成器接口（duck typing，避免依赖 snowflake-id 的类型声明）
 */
interface SnowflakeGenerator {
  generate: () => bigint;
}

/**
 * 雪花 ID 生成器
 *
 * 基于 Twitter Snowflake 算法生成分布式唯一 ID。
 * ID 结构（64 位）:
 *   [符号位 1bit] [时间戳 41bit] [机器 ID 10bit] [序列号 12bit]
 *
 * 特性:
 * - 趋势递增（对 MySQL InnoDB 索引友好）
 * - 不依赖数据库自增，支持分布式生成
 * - 每毫秒每机器可生成 4096 个 ID
 * - 内置纪元偏移，ID 更短（从自定义纪元开始计时而非 1970）
 *
 * 使用方式:
 *   constructor(private readonly idService: SnowflakeIdService) {}
 *
 *   const id = this.idService.generate();     // 返回 BigInt: 177297814341029888n
 *   const idStr = this.idService.genString();  // 返回字符串: "177297814341029888"
 *
 * 配置（.env）:
 *   SNOWFLAKE_EPOCH=2025-01-01   # 纪元起始日期（越近 ID 越短）
 *   SNOWFLAKE_MACHINE_ID=1       # 机器 ID（0-1023，每个实例必须不同）
 */
@Injectable()
export class SnowflakeIdService implements OnModuleInit {
  private readonly logger = new Logger(SnowflakeIdService.name);
  private generator: SnowflakeGenerator | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // 读取机器 ID（0-1023，分布式部署时每个实例不同）
    const machineId = this.configService.get<number>("snowflake.machineId", 1);

    // 读取纪元偏移（默认 2025-01-01，距 1970-01-01 的毫秒数）
    const epochDate = this.configService.get<string>(
      "snowflake.epoch",
      "2025-01-01"
    );
    const offset = new Date(epochDate).getTime();

    if (offset < 0 || Number.isNaN(offset)) {
      throw new Error(
        `Snowflake 纪元日期无效: "${epochDate}"，请检查 SNOWFLAKE_EPOCH 配置`
      );
    }

    if (machineId < 0 || machineId > 1023) {
      throw new Error(
        `Snowflake 机器 ID 超出范围: ${machineId}，允许范围 0-1023`
      );
    }

    // 动态导入 snowflake-id（ESM 兼容处理）
    // snowflake-id 的 ESM 导出为 { default: { default: SnowflakeId } }
    const mod = await import("snowflake-id");
    const SnowflakeIdCtor =
      (
        mod.default as {
          default?: new (...args: unknown[]) => SnowflakeGenerator;
        }
      )?.default ??
      (mod.default as new (...args: unknown[]) => SnowflakeGenerator);

    this.generator = new SnowflakeIdCtor({
      mid: machineId, // 机器 ID（10 bit，0-1023）
      offset, // 纪元偏移量（毫秒）
    });

    this.logger.log(
      `雪花 ID 生成器初始化完成 — 机器 ID: ${machineId}，纪元: ${epochDate}`
    );
  }

  /**
   * 确保 generator 已初始化
   */
  private ensureInitialized(): SnowflakeGenerator {
    if (!this.generator) {
      throw new Error("SnowflakeIdService 尚未初始化，请检查模块是否正确注册");
    }
    return this.generator;
  }

  /**
   * 生成雪花 ID（BigInt 类型）
   * 适用于需要精确数值运算的场景
   */
  generate(): bigint {
    return this.ensureInitialized().generate();
  }

  /**
   * 生成雪花 ID（字符串类型）
   * 适用于 JSON 序列化、数据库存储、API 响应
   * JavaScript 的 Number 无法安全表示超过 2^53 的整数，必须使用字符串
   */
  genString(): string {
    return this.ensureInitialized().generate().toString();
  }

  /**
   * 生成雪花 ID（数字类型）
   * 注意: 当 ID 超过 Number.MAX_SAFE_INTEGER 时精度会丢失
   * 推荐使用 genString() 或 generate()
   */
  genNumber(): number {
    return Number(this.ensureInitialized().generate());
  }
}
