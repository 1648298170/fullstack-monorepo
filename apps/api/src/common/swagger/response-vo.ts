import { ApiProperty } from "@nestjs/swagger";
import type { Type } from "@nestjs/common";

/**
 * 统一响应包装类工厂
 *
 * 实际响应由全局 TransformInterceptor 统一包装为 { code, message, data }。
 * 本工厂为给定 data 的 VO 类型生成一个具体的包装类，
 * 供 @ApiOkResponse({ type: ResponseVo(UserVo) }) 使用，
 * 让前端在文档中看到真实的响应结构 + 字段说明 + 示例。
 *
 * 用法:
 *   @ApiOkResponse({ type: ResponseVo(UserVo) })
 *   @ApiOkResponse({ type: ResponseVo(PageResultVo(UserVo)) }) // 分页
 */
export function ResponseVo<T>(dataVo: Type<T>) {
  class ResponseVoClass {
    @ApiProperty({ example: 200, description: "状态码" })
    code: number;

    @ApiProperty({ example: "success", description: "提示信息" })
    message: string;

    @ApiProperty({ type: () => dataVo, description: "响应数据" })
    data: T;
  }

  // 设置唯一类名，避免 Swagger schema 名称冲突
  Object.defineProperty(ResponseVoClass, "name", {
    value: `ResponseVo_${dataVo.name}`,
  });

  return ResponseVoClass as unknown as Type<{
    code: number;
    message: string;
    data: T;
  }>;
}

/**
 * 数组响应包装类工厂
 *
 * 用于 data 本身是数组的响应（如「查询所有角色」），与 ResponseVo 区别仅在于 data 是数组：
 *
 *   @ApiOkResponse({ type: ArrayResponseVo(RoleVo) })
 *
 * 文档展示结构:
 *   { code, message, data: RoleVo[] }
 */
export function ArrayResponseVo<T>(itemVo: Type<T>) {
  class ArrayResponseVoClass {
    @ApiProperty({ example: 200, description: "状态码" })
    code: number;

    @ApiProperty({ example: "success", description: "提示信息" })
    message: string;

    @ApiProperty({
      type: () => [itemVo],
      description: "响应数据（数组）",
    })
    data: T[];
  }

  Object.defineProperty(ArrayResponseVoClass, "name", {
    value: `ArrayResponseVo_${itemVo.name}`,
  });

  return ArrayResponseVoClass as unknown as Type<{
    code: number;
    message: string;
    data: T[];
  }>;
}
