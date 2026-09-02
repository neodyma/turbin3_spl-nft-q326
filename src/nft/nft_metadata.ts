import {
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import wallet from "../../devnet-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(
  irysUploader({
    address: "https://devnet.irys.xyz/",
  })
);

umi.use(signerIdentity(signer));

(async () => {
  try {
    //change the image uri to your image uri obtained from nft_image.ts
    const image =
      "https://gateway.irys.xyz/FxenccNqC58hSz6D2ajDFH1UJNQE4WmLZtHkag243p2v";

    // json schema: https://www.metaplex.com/docs/smart-contracts/core/json-schema
    const metadata: JsonMetadata = {
      name: "Watch Lions #000",
      description: "A legendary watcher lion with piercing glare",
      image,
      category: "image",
      properties: {
        files: [{ uri: image, type: "image/png" }],
      },
    };
    const myUri = await umi.uploader.uploadJson(metadata);

    // https://gateway.irys.xyz/8MNLwLPT3szuDsj925G8gSZgFVZg3v4hY9dWA4K6qaBP
    console.log(`metadata uri: ${myUri} `);
  } catch (error) {
    console.log("error", error);
  }
})();
