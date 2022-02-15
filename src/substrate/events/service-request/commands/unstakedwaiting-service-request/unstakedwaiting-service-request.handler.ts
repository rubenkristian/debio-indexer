import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { RequestStatus } from '../../models/requestStatus';
import { UnstakedWaitingServiceRequestCommand } from './unstakedwaiting-service-request.command';

@Injectable()
@CommandHandler(UnstakedWaitingServiceRequestCommand)
export class UnstakedWaitingServiceRequestHandler
  implements ICommandHandler<UnstakedWaitingServiceRequestCommand>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: UnstakedWaitingServiceRequestCommand) {
    await this.elasticsearchService.update({
      index: 'create-service-request',
      id: command.request.hash,
      refresh: 'wait_for',
      body: {
        doc: {
          request: {
            status: RequestStatus.WaitingForUnstaked,
            updated_at: command.request.updated_at,
            unstaked_at: command.request.unstaked_at,
          },
          blockMetadata: command.blockMetaData,
        },
      },
    });

    const { body } = await this.elasticsearchService.search({
      index: 'create-service-request',
      body: {
        query: {
          match: { _id: command.request.hash }
        }
      }
    });

    const requestService = body.hits.hits[0];
    if (requestService) {
      const source = requestService._source;
      const service = `${source.request.hash}-${source.request.country}-${source.request.region}-${source.request.city}-${source.request.service_category}-${source.request.staking_amount}`;

      await this.elasticsearchService.update({
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
