import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';
import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SecretKeyList, keyList } from '@common/secrets';
import {
  EmailNotificationModule,
  MailModule,
  ProcessEnvModule,
  SubstrateModule,
  SubstrateService,
} from '@common/index';
import { MailerService } from './mailer/mailer.service';
import { UnstakedService } from './unstaked/unstaked.service';
import { MenstrualSubscriptionService } from './menstrual-subscription/menstrual-subscription.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabRating } from './rating/model/rating.entity';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [
        GCloudSecretManagerModule.withConfig(process.env.PARENT, SecretKeyList),
      ],
      inject: [GCloudSecretManagerService],
      useFactory: async (
        gCloudSecretManagerService: GCloudSecretManagerService<keyList>,
      ) => {
        return {
          node: gCloudSecretManagerService
            .getSecret('ELASTICSEARCH_NODE')
            .toString(),
          auth: {
            username: gCloudSecretManagerService
              .getSecret('ELASTICSEARCH_USERNAME')
              .toString(),
            password: gCloudSecretManagerService
              .getSecret('ELASTICSEARCH_PASSWORD')
              .toString(),
          },
        };
      },
    }),
    ProcessEnvModule,
    SubstrateModule,
    MailModule,
    EmailNotificationModule,
    TypeOrmModule.forFeature([LabRating]),
    BullModule.forRootAsync({
      useFactory: async (
        gCloudSecretManagerService: GCloudSecretManagerService<keyList>,
      ) => {
        return {
          redis: {
            host: gCloudSecretManagerService.getSecret('REDIS_HOST').toString(),
            port: Number(
              gCloudSecretManagerService.getSecret('REDIS_PORT').toString(),
            ),
          },
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: 'rating-queue',
    }),
  ],
  exports: [ElasticsearchModule],
  providers: [
    UnstakedService,
    SubstrateService,
    MailerService,
    MenstrualSubscriptionService,
  ],
})
export class SchedulersModule {}
