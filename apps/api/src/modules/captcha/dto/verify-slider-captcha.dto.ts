import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/** 前端拖动过程中的一个轨迹点，用于判断操作是否接近真实用户行为。 */
export class SliderTrackPointDto {
  /** 当前轨迹点的横向偏移。 */
  @ApiProperty({ example: 12 })
  @IsInt()
  x: number;

  /** 当前轨迹点的纵向偏移，允许轻微抖动。 */
  @ApiProperty({ example: 1 })
  @IsInt()
  y: number;

  /** 从拖动开始到当前轨迹点的耗时，单位毫秒。 */
  @ApiProperty({ example: 80, description: "Elapsed milliseconds" })
  @IsInt()
  @Min(0)
  t: number;
}

/** 滑块验证码校验请求体。 */
export class VerifySliderCaptchaDto {
  /** 创建滑块挑战时返回的验证码 ID。 */
  @ApiProperty({ example: "cpt_1234567890" })
  @IsString()
  @IsNotEmpty()
  captchaId: string;

  /** 用户最终拖动到的横向偏移，后端会与 Redis 中的真实 x 比较。 */
  @ApiProperty({ example: 181, description: "Final slider x offset" })
  @IsInt()
  @Min(0)
  @Max(500)
  x: number;

  /** 拖动轨迹，过少或过于机械的轨迹会被拒绝。 */
  @ApiProperty({ type: [SliderTrackPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SliderTrackPointDto)
  track: SliderTrackPointDto[];
}
