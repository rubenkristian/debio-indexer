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
  constructor(private readonly elasticSearchService: ElasticsearchService) {}

  async execute(command: ProcessedServiceRequestCommand) {
    await this.elasticSearchService.update({
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

    const { body } = await this.elasticSearchService.search({
      index: 'create-service-request',
      body: {
        query: {
          match: { _id: command.serviceInvoice.requestHash }
        }
      }
    });

    const requestService = body.hits.hits[0];
    if (requestService) {
      const source = requestService._source;
      const service = `${source.request.hash}-${source.request.country}-${source.request.region}-${source.request.city}-${source.request.service_category}-${source.request.staking_amount}`;

      await this.elasticSearchService.update({
        index: 'country-service-request',
        id: source.request.country,
        refresh: 'wait_for',
        body: {
          script: {
            lang: 'painless',
            source: `
              if (ctx._source.services.contains(params.service)) {
                ctx._source.services.remove(ctx._source.services.indexOf(params.service));
              }
            `,
            params: {
              service: service
            }
          }
        }
      });
    }
  }
}
