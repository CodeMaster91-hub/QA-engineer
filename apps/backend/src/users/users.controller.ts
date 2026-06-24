import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private userSettingsService: UserSettingsService,
  ) {}

  @Get()
  @Roles('admin')
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      login: user.login,
      roles: user.roles,
      createdAt: user.createdAt,
    }));
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    const foundUser = await this.usersService.findById(user.id);
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }
    return {
      id: foundUser.id,
      email: foundUser.email,
      displayName: foundUser.displayName,
      login: foundUser.login,
      roles: foundUser.roles,
      createdAt: foundUser.createdAt,
    };
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      login: user.login,
      roles: user.roles,
      updatedAt: user.updatedAt,
    };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
    return { message: 'User deleted successfully' };
  }

  @Get('settings')
  async getSettings(@Req() req: Request) {
    const user = req.user as any;
    return this.userSettingsService.getAll(user.id);
  }

  @Get('settings/:key')
  async getSetting(@Req() req: Request, @Param('key') key: string) {
    const user = req.user as any;
    const value = await this.userSettingsService.get(user.id, key);
    return { key, value };
  }

  @Patch('settings')
  async updateSettings(
    @Req() req: Request,
    @Body() body: Record<string, any>,
  ) {
    const user = req.user as any;
    await this.userSettingsService.setMultiple(user.id, body);
    return { message: 'Settings updated' };
  }

  @Patch('settings/:key')
  async updateSetting(
    @Req() req: Request,
    @Param('key') key: string,
    @Body('value') value: any,
  ) {
    const user = req.user as any;
    await this.userSettingsService.set(user.id, key, value);
    return { key, value };
  }

  @Delete('settings/:key')
  async deleteSetting(@Req() req: Request, @Param('key') key: string) {
    const user = req.user as any;
    await this.userSettingsService.delete(user.id, key);
    return { message: 'Setting deleted' };
  }
}
