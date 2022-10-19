import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GeneticAnalystRegisteredCommand } from './genetic-analyst-registered.command';
import { NotificationDto } from '../../../../../common/notification/dto/notification.dto';
import { DateTimeProxy, geneticAnalystToGARegister, MailerManager, NotificationService, SubstrateService } from '../../../../../common';
import { GCloudSecretManagerService } from '@debionetwork/nestjs-gcloud-secret-manager';
import { keyList } from '../../../../../common/secrets';
import { queryGeneticAnalystByAccountId } from '@debionetwork/polkadot-provider';

@Injectable()
@CommandHandler(GeneticAnalystRegisteredCommand)
export class GeneticAnalystRegisteredHandler
  implements ICommandHandler<GeneticAnalystRegisteredCommand>
{
  private readonly logger: Logger = new Logger(
    GeneticAnalystRegisteredHandler.name,
  );
  constructor(
    private readonly gCloudSecretManagerService: GCloudSecretManagerService<keyList>,
    private readonly notificationService: NotificationService,
    private readonly dateTimeProxy: DateTimeProxy,
    private readonly mailManager: MailerManager,
    private readonly substrateService: SubstrateService,
  ) {}
  async execute(command: GeneticAnalystRegisteredCommand) {
    const geneticAnalyst = command.geneticAnalyst;
    const blockNumber = command.blockMetaData.blockNumber.toString();
    try {
      const currDateTime = this.dateTimeProxy.new();

      const geneticAnalystServiceNotification: NotificationDto = {
        role: 'GA',
        entity_type: 'Submit account registration and verification',
        entity: 'registration and verification',
        reference_id: null,
        description: `You've successfully submitted your account verification.`,
        read: false,
        created_at: currDateTime,
        updated_at: currDateTime,
        deleted_at: null,
        from: 'Debio Network',
        to: geneticAnalyst.accountId,
        block_number: blockNumber,
      };

      await this.notificationService.insert(geneticAnalystServiceNotification);

      const contextGA = await queryGeneticAnalystByAccountId(
        this.substrateService.api as any,
        geneticAnalyst.accountId,
      );
      const geneticAnalystRegister = await geneticAnalystToGARegister(
        this.substrateService.api as any,
        contextGA,
      );
      await this.mailManager.sendGeneticAnalystRegistrationEmail(
        this.gCloudSecretManagerService.getSecret('EMAILS').split(','),
        geneticAnalystRegister,
      )
    } catch (error) {
      this.logger.log(error);
    }
  }
}
