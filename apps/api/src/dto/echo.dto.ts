import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EchoDto {
  @ApiProperty({
    description: "Message to echo back",
    example: "ping"
  })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    description: "How many times to repeat the echo (validation example)",
    example: 2,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  @Type(() => Number)
  repeat?: number;
}
