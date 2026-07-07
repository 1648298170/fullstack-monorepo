import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";
import { RoleService } from "./role.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignRolePermissionsDto } from "./dto/assign-role-permissions.dto";
import { AssignRoleMenusDto } from "./dto/assign-role-menus.dto";
import { QueryRoleDto } from "./dto/query-role.dto";
import { RoleVo } from "./vo/role.vo";
import { ResponseVo, ArrayResponseVo } from "../../common/swagger/response-vo";
import { PageResultVo } from "../../common/swagger/page-result-vo";
import {
  errorExample,
  NO_DATA_SUCCESS_EXAMPLE,
} from "../../common/swagger/error-example";

/** 错误响应示例（结构由 errorExample 统一维护，与全局 AllExceptionsFilter 输出一致） */
const NOT_FOUND_EXAMPLE = errorExample(
  "ROLE_NOT_FOUND",
  { id: "1900000000000000001" },
  "/roles/1900000000000000001"
);
const CONFLICT_EXAMPLE = errorExample(
  "ROLE_CODE_EXISTS",
  { code: "admin" },
  "/roles/add"
);

/**
 * 角色管理控制器
 *
 * 提供角色的 CRUD 接口和权限 / 菜单分配接口。
 * 所有接口需要认证（受全局 AuthGuard 保护）。
 */
@ApiTags("角色管理")
@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get("page")
  @ApiOperation({
    summary: "分页查询角色列表",
    description: "支持按名称 / 编码关键词搜索",
  })
  @ApiOkResponse({
    description: "分页角色列表",
    type: ResponseVo(PageResultVo(RoleVo)),
  })
  findPage(@Query() query: QueryRoleDto) {
    return this.roleService.findPage(query);
  }

  @Get()
  @ApiOperation({ summary: "查询所有角色（平铺）" })
  @ApiOkResponse({
    description: "全部角色列表",
    type: ArrayResponseVo(RoleVo),
  })
  findAll() {
    return this.roleService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "查询角色详情" })
  @ApiOkResponse({ description: "角色详情", type: ResponseVo(RoleVo) })
  @ApiNotFoundResponse({
    description: "角色不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  findOne(@Param("id") id: string) {
    return this.roleService.findOne(id);
  }

  @Post("add")
  @ApiOperation({ summary: "创建角色" })
  @ApiCreatedResponse({
    description: "创建成功，返回角色详情",
    type: ResponseVo(RoleVo),
  })
  @ApiConflictResponse({
    description: "角色编码已存在",
    schema: { example: CONFLICT_EXAMPLE },
  })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Put("update/:id")
  @ApiOperation({ summary: "更新角色信息" })
  @ApiOkResponse({
    description: "更新后的角色信息",
    type: ResponseVo(RoleVo),
  })
  @ApiNotFoundResponse({
    description: "角色不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete("delete/:id")
  @ApiOperation({ summary: "删除角色（软删除）" })
  @ApiOkResponse({
    description: "删除成功（无返回数据）",
    schema: { example: NO_DATA_SUCCESS_EXAMPLE },
  })
  @ApiNotFoundResponse({
    description: "角色不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  remove(@Param("id") id: string) {
    return this.roleService.remove(id);
  }

  @Put(":id/permissions")
  @ApiOperation({
    summary: "分配角色权限",
    description: "全量替换角色的权限列表",
  })
  @ApiOkResponse({
    description: "分配权限后的角色信息",
    type: ResponseVo(RoleVo),
  })
  @ApiNotFoundResponse({
    description: "角色或权限不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  assignPermissions(
    @Param("id") id: string,
    @Body() dto: AssignRolePermissionsDto
  ) {
    return this.roleService.assignPermissions(id, dto.permissionIds);
  }

  @Put(":id/menus")
  @ApiOperation({
    summary: "分配角色菜单",
    description: "全量替换角色的菜单列表",
  })
  @ApiOkResponse({
    description: "分配菜单后的角色信息",
    type: ResponseVo(RoleVo),
  })
  @ApiNotFoundResponse({
    description: "角色或菜单不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  assignMenus(@Param("id") id: string, @Body() dto: AssignRoleMenusDto) {
    return this.roleService.assignMenus(id, dto.menuIds);
  }
}
