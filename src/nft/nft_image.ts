import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { readFile } from "fs/promises";

import wallet from "../../devnet-wallet.json";

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
    const image = await readFile("image.png");

    const file = createGenericFile(new Uint8Array(image), "watch-lion-0.png", {
      contentType: "image/png",
    });

    const [myUri] = await umi.uploader.upload([file]);

    // https://gateway.irys.xyz/FxenccNqC58hSz6D2ajDFH1UJNQE4WmLZtHkag243p2v
    console.log("Your image URI: ", myUri);
  } catch (error) {
    console.log(error);
  }
})();
