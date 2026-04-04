import { IsString } from 'class-validator';

export class BroadcastNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;
}