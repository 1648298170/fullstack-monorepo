import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { MenuService } from "./menu.service";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { MenuVo } from "./vo/menu.vo";
import { MenuTreeNodeVo } from "./vo/menu-tree-node.vo";
import { ResponseVo, ArrayResponseVo } from "../../common/swagger/response-vo";
import {
  errorExample,
  NO_DATA_SUCCESS_EXAMPLE,
} from "../../common/swagger/error-example";

/** 错误响应示例（结构由 errorExample 统一维护，与全局 AllExceptionsFilter 输出一致） */
const NOT_FOUND_EXAMPLE = errorExample(
  "MENU_NOT_FOUND",
  { id: "1900000000000000020" },
  "/menus/1900000000000000020"
);
const PARENT_NOT_FOUND_EXAMPLE = errorExample(
  "PARENT_MENU_NOT_FOUND",
  { id: "1900000000000000099" },
  "/menus/add"
);

/**
 * 菜单管理控制器
 *
 * 提供菜单的 CRUD 接口和树形结构查询。
 * 所有接口需要认证（受全局 AuthGuard 保护）。
 */
@ApiTags("菜单管理")
@Controller("menus")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get("page")
  @ApiOperation({ summary: "查询所有菜单（平铺）" })
  @ApiOkResponse({
    description: "全部菜单平铺列表",
    type: ArrayResponseVo(MenuVo),
  })
  findAll() {
    return this.menuService.findAll();
  }

  @Get("tree")
  @ApiOperation({ summary: "查询菜单树形结构" })
  @ApiOkResponse({
    description: "菜单树形结构（递归 children）",
    type: ArrayResponseVo(MenuTreeNodeVo),
  })
  findTree() {
    return this.menuService.findTree();
  }

  @Get(":id")
  @ApiOperation({ summary: "查询菜单详情" })
  @ApiOkResponse({ description: "菜单详情", type: ResponseVo(MenuVo) })
  @ApiNotFoundResponse({
    description: "菜单不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  findOne(@Param("id") id: string) {
    return this.menuService.findOne(id);
  }

  @Post("add")
  @ApiOperation({ summary: "创建菜单" })
  @ApiCreatedResponse({
    description: "创建成功，返回菜单详情",
    type: ResponseVo(MenuVo),
  })
  @ApiNotFoundResponse({
    description: "父菜单不存在",
    schema: { example: PARENT_NOT_FOUND_EXAMPLE },
  })
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Put("update/:id")
  @ApiOperation({ summary: "更新菜单" })
  @ApiOkResponse({
    description: "更新后的菜单信息",
    type: ResponseVo(MenuVo),
  })
  @ApiNotFoundResponse({
    description: "菜单不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  update(@Param("id") id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto);
  }

  @Delete("delete/:id")
  @ApiOperation({ summary: "删除菜单（软删除）" })
  @ApiOkResponse({
    description: "删除成功（无返回数据）",
    schema: { example: NO_DATA_SUCCESS_EXAMPLE },
  })
  @ApiNotFoundResponse({
    description: "菜单不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  remove(@Param("id") id: string) {
    return this.menuService.remove(id);
  }
}
