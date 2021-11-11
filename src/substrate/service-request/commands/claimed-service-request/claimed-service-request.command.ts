import { BlockMetadata } from "../../models/blockMetadata";
import { ClaimRequestModel } from "../../models/claimRequest";

export class ClaimedServiceRequestCommand {
    request: ClaimRequestModel;
    blockMetadata: BlockMetadata;
    constructor(args: Array<ClaimRequestModel>, blockMetadata: BlockMetadata) {
      this.request = args[1];
      this.blockMetadata = blockMetadata;
    }
}