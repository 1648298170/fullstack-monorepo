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
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { UserVo } from "./vo/user.vo";
import { ResponseVo } from "../../common/swagger/response-vo";
import { PageResultVo } from "../../common/swagger/page-result-vo";
import {
  errorExample,
  NO_DATA_SUCCESS_EXAMPLE,
} from "../../common/swagger/error-example";

/** 错误响应示例（结构由 errorExample 统一维护，与全局 AllExceptionsFilter 输出一致） */
const NOT_FOUND_EXAMPLE = errorExample(
  "USER_NOT_FOUND",
  { id: "1900000000000000001" },
  "/users/1900000000000000001"
);
const CONFLICT_EXAMPLE = errorExample(
  "USERNAME_EXISTS",
  { name: "zhangsan" },
  "/users/add"
);

/**
 * 用户管理控制器
 *
 * 提供用户的 CRUD 接口和角色分配接口。
 * 所有接口需要认证（受全局 AuthGuard 保护）。
 */
@ApiTags("用户管理")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("page")
  @ApiOperation({
    summary: "分页查询用户列表",
    description: "支持分页和关键词搜索",
  })
  @ApiOkResponse({
    description: "分页用户列表",
    type: ResponseVo(PageResultVo(UserVo)),
  })
  findPage(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "查询用户详情" })
  @ApiOkResponse({ description: "用户详情", type: ResponseVo(UserVo) })
  @ApiNotFoundResponse({
    description: "用户不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Post("add")
  @ApiOperation({ summary: "创建用户" })
  @ApiCreatedResponse({
    description: "创建成功，返回用户详情",
    type: ResponseVo(UserVo),
  })
  @ApiConflictResponse({
    description: "用户名已存在",
    schema: { example: CONFLICT_EXAMPLE },
  })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put("update/:id")
  @ApiOperation({ summary: "更新用户信息" })
  @ApiOkResponse({
    description: "更新后的用户信息",
    type: ResponseVo(UserVo),
  })
  @ApiNotFoundResponse({
    description: "用户不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete("delete/:id")
  @ApiOperation({ summary: "删除用户（软删除）" })
  @ApiOkResponse({
    description: "删除成功（无返回数据）",
    schema: { example: NO_DATA_SUCCESS_EXAMPLE },
  })
  @ApiNotFoundResponse({
    description: "用户不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  remove(@Param("id") id: string) {
    return this.userService.remove(id);
  }

  @Put(":id/roles")
  @ApiOperation({
    summary: "分配用户角色",
    description: "全量替换用户的角色列表",
  })
  @ApiOkResponse({
    description: "分配角色后的用户信息",
    type: ResponseVo(UserVo),
  })
  @ApiNotFoundResponse({
    description: "用户或角色不存在",
    schema: { example: NOT_FOUND_EXAMPLE },
  })
  assignRoles(@Param("id") id: string, @Body() body: AssignUserRolesDto) {
    return this.userService.assignRoles(id, body.roleIds);
  }
}
