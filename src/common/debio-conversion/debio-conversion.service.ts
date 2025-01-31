import { GCloudSecretManagerService } from '@debionetwork/nestjs-gcloud-secret-manager';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { keyList } from '@common/secrets';

@Injectable()
export class DebioConversionService {
  private readonly logger: Logger = new Logger(DebioConversionService.name);
  constructor(
    private readonly gCloudSecretManagerService: GCloudSecretManagerService<keyList>,
  ) {}

  async getExchange() {
    try {
      const res = await axios.get(
        `${this.gCloudSecretManagerService
          .getSecret('REDIS_STORE_URL')
          .toString()}/cache`,
        {
          auth: {
            username: this.gCloudSecretManagerService
              .getSecret('REDIS_STORE_USERNAME')
              .toString(),
            password: this.gCloudSecretManagerService
              .getSecret('REDIS_STORE_PASSWORD')
              .toString(),
          },
        },
      );

      return res.data;
    } catch (error) {
      this.logger.log(`API conversion": ${error.message}`);
    }
  }

  async getExchangeFromTo(from: string, to: string) {
    try {
      const res = await axios.get(
        `${this.gCloudSecretManagerService
          .getSecret('REDIS_STORE_URL')
          .toString()}/cache`,
        {
          params: {
            from,
            to,
          },
          auth: {
            username: this.gCloudSecretManagerService
              .getSecret('REDIS_STORE_USERNAME')
              .toString(),
            password: this.gCloudSecretManagerService
              .getSecret('REDIS_STORE_PASSWORD')
              .toString(),
          },
        },
      );

      return res.data;
    } catch (error) {
      this.logger.log(`API conversion": ${error.message}`);
    }
  }
}
