import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { RequestStatus } from '../../models/requestStatus';
import { ProcessedServiceRequestCommand } from './processed-service-request.command';

@Injectable()
@CommandHandler(ProcessedServiceRequestCommand)
export class ProcessedServiceRequestHandler
  implements ICommandHandler<ProcessedServiceRequestCommand>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: ProcessedServiceRequestCommand) {
    await this.elasticsearchService.update({
      index: 'create-service-request',
      id: command.serviceInvoice.requestHash,
      refresh: 'wait_for',
      body: {
        script: {
          lang: 'painless',
          source: `
            ctx._source.request.lab_address = params.lab_address;
            ctx._source.request.status      = params.status;
            ctx._source.blockMetadata       = params.blockMetaData;
          `,
          params: {
            lab_address: command.serviceInvoice.sellerAddress,
            status: RequestStatus.Processed,
            blockMetaData: command.blockMetaData,
          },
        },
      },
    });

    const { body } = await this.elasticsearchService.search({
      index: 'create-service-request',
      body: {
        query: {
          match: { _id: command.serviceInvoice.requestHash },
        },
      },
    });

    const service_request = body.hits?.hits[0]?._source || null;

    if (service_request != null) {
      await this.elasticsearchService.update({
        index: 'country-service-request',
        id: service_request.country,
        refresh: 'wait_for',
        body: {
          script: {
            lang: 'painless',
            source: `
              def services = ctx._source.service_request
              for (int i = 0; i < services.length; i++) {
                if (services[i].id == params.id) {
                  ctx._source.service_request.remove(i);
                  break;
                }
              }
            `,
            params: {
              id: command.serviceInvoice.requestHash,
            },
          },
          upsert: {
            counter: 1,
          },
        },
      });
    }
  }
}
