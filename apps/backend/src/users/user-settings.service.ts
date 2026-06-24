import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSetting } from './user-setting.entity';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSetting)
    private settingsRepository: Repository<UserSetting>,
  ) {}

  async get(userId: string, key: string): Promise<any | null> {
    const setting = await this.settingsRepository.findOne({
      where: { userId, key },
    });
    return setting?.value || null;
  }

  async getAll(userId: string): Promise<Record<string, any>> {
    const settings = await this.settingsRepository.find({
      where: { userId },
    });
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async set(userId: string, key: string, value: any): Promise<void> {
    let setting = await this.settingsRepository.findOne({
      where: { userId, key },
    });

    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepository.create({ userId, key, value });
    }

    await this.settingsRepository.save(setting);
  }

  async setMultiple(
    userId: string,
    settings: Record<string, any>,
  ): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(userId, key, value);
    }
  }

  async delete(userId: string, key: string): Promise<void> {
    await this.settingsRepository.delete({ userId, key });
  }
}
