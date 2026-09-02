import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  DataV2Args,
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";

// mint address from spl_init.ts
const mint = publicKey("5w7HrxgaP962bm4ADxdpn77jPmcBiSaxW68TPTCWNLtu");

const umi = createUmi("https://api.devnet.solana.com");

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

(async () => {
  try {
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint,
      mintAuthority: signer,
    };

    const data: DataV2Args = {
      name: "Watch Lion Coin",
      symbol: "WLxx",
      uri: "https://arweave.net/123456",
      sellerFeeBasisPoints: 1,
      creators: null,
      collection: null,
      uses: null,
    };

    const args: CreateMetadataAccountV3InstructionArgs = {
      data,
      isMutable: true,
      collectionDetails: null,
    };

    const tx = createMetadataAccountV3(umi, {
      ...accounts,
      ...args,
    });

    const result = await tx.sendAndConfirm(umi);

    // yv1fDoSUBsT9GowxNVHZhhVbN2C8C3oDx9bW7xVmxEfk55xHApHy5C9uVdpqVira2JpYcTmonp7yitsKzXEgwC9
    console.log("signature: ", bs58.encode(Buffer.from(result.signature)));
  } catch (error) {
    console.log("error", error);
  }
})();
