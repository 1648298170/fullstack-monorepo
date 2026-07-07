import { ApiProperty } from "@nestjs/swagger";
import type { Type } from "@nestjs/common";

/**
 * 分页结果包装类工厂
 *
 * 生成 { list, total, page, pageSize } 分页结构类。
 * 配合 ResponseVo 使用，文档中体现完整的响应包装：
 *
 *   @ApiOkResponse({ type: ResponseVo(PageResultVo(UserVo)) })
 *
 * 文档展示结构:
 *   { code, message, data: { list: UserVo[], total, page, pageSize } }
 */
export function PageResultVo<T>(itemVo: Type<T>) {
  class PageResultVoClass {
    @ApiProperty({
      type: () => [itemVo],
      description: "列表数据",
    })
    list: T[];

    @ApiProperty({ example: 100, description: "总条数" })
    total: number;

    @ApiProperty({ example: 1, description: "当前页码" })
    page: number;

    @ApiProperty({ example: 10, description: "每页条数" })
    pageSize: number;
  }

  // 设置唯一类名，避免 Swagger schema 名称冲突
  Object.defineProperty(PageResultVoClass, "name", {
    value: `PageResultVo_${itemVo.name}`,
  });

  return PageResultVoClass as unknown as Type<{
    list: T[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
