import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { fetchAsset, mplCore, update } from "@metaplex-foundation/mpl-core";
import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { base58 } from "@metaplex-foundation/umi/serializers";

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

umi.use(mplCore());

(async () => {
  try {
    const assetAddress = publicKey(
      "FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6"
    );

    const image =
      "https://gateway.irys.xyz/FxenccNqC58hSz6D2ajDFH1UJNQE4WmLZtHkag243p2v";

    const name = "Watch Lions #00";

    const metadata: JsonMetadata = {
      name,
      description: "A legendary watcher lion with piercing glare",
      image,
      category: "image",
      properties: {
        files: [{ uri: image, type: "image/png" }],
      },
    };

    const metadataUri = await umi.uploader.uploadJson(metadata);

    // https://gateway.irys.xyz/NZQJJzhLUYHjVyvHNU4ThxKJk8otVa3xeTcWhVkvFiS
    console.log(`updated metadata uri: ${metadataUri}`);

    const asset = await fetchAsset(umi, assetAddress);

    const tx = await update(umi, {
      asset,
      authority: signer,
      name,
      uri: metadataUri,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    // signature L2yZG9dEBAQYgJiL9YtXZXWmVZJdTG7ZNx9rGArDDAEGHrpbYSfxRY3kYW98pRJZY29MjBZUBLFEpDgAVNVbYm9
    // asset: FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6
    console.log(`signature ${signature}, asset: ${asset.publicKey}`);
  } catch (error) {
    console.log("error", error);
  }
})();
