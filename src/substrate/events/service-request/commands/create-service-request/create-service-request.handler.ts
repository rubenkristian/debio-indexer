import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateServiceRequestCommand } from './create-service-request.command';

@Injectable()
@CommandHandler(CreateServiceRequestCommand)
export class CreateServiceRequestHandler
  implements ICommandHandler<CreateServiceRequestCommand>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: CreateServiceRequestCommand) {
    await this.elasticsearchService.index({
      index: 'create-service-request',
      id: command.request.hash,
      refresh: 'wait_for',
      body: {
        request: command.request,
        blockMetadata: command.blockMetadata,
      },
    });

    const { body } = await this.elasticsearchService.search({
      index: 'country-service-request',
      body: {
        query: {
          match: { _id: command.request.country }
        }
      },
      allow_no_indices: true
    });

    const service = `${command.request.hash}-${command.request.country}-${command.request.region}-${command.request.city}-${command.request.service_category}-${command.request.staking_amount}`;

    if (body.hits.hits[0]) {
      await this.elasticsearchService.update({
        index: 'country-service-request',
        id: command.request.country,
        refresh: 'wait_for',
        body: {
          script: {
            lang: 'painless',
            source: `
              if (!ctx._source.services.contains(params.service)) {
                ctx._source.services.add(params.service);
              }
            `,
            params: {
              service: service
            }
          }
        }
      });
    } else {
      const services = [];
      services.push(service);
      await this.elasticsearchService.index({
        index: 'country-service-request',
        id: command.request.country,
        refresh: 'wait_for',
        body: {
          services: services
        }
      });
    }
  }
}
