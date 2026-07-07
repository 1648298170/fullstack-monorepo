import { ApiProperty } from "@nestjs/swagger";

/**
 * 登录 / 注册 Token 响应 VO
 */
export class TokenResultVo {
  @ApiProperty({
    description: "访问令牌（Access Token，有效期较短）",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description:
      "刷新令牌（Refresh Token，有效期较长，用于换取新 Access Token）",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken: string;

  @ApiProperty({
    description: "令牌类型",
    example: "Bearer",
  })
  tokenType: string;
}
