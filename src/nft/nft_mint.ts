import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

(async () => {
  try {
    const metadataUri =
      "https://gateway.irys.xyz/8MNLwLPT3szuDsj925G8gSZgFVZg3v4hY9dWA4K6qaBP";
    const asset = generateSigner(umi);

    const tx = await create(umi, {
      asset,
      name: "Watch Lions #000",
      uri: metadataUri,
      owner: signer.publicKey,
      updateAuthority: signer.publicKey,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    // signature mpTZ9Rk6RvzFYWX1nu9vu8EyXdEK7UwH5kXdUnwJpaqfCUEbx9g1dQLTgRKYCugG3DtH15uqPGehPhJM8rMTbxK
    // asset: FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6
    console.log(`signature ${signature}, asset: ${asset.publicKey}`);
  } catch (e) {
    console.log(`errior ${e}`);
  }
})();
