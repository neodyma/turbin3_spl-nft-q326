import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import newOwnerWallet from "../../new-owner-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { burn, fetchAsset, mplCore } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
);

const keypair = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(newOwnerWallet)
);
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));

umi.use(mplCore());

(async () => {
  try {
    const assetAddress = publicKey(
      "FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6"
    );

    const asset = await fetchAsset(umi, assetAddress);

    const tx = await burn(umi, {
      asset,
      authority: signer,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    // signature 3WJCXgssNrHoRTUwB2E6jcUHAtGJqEo8iVr2dMRwCXdePhGHB6Cn8xmk67thGF5Gnqxgf5i6av6rGTDLCqdt8ghy
    // burned asset: FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6
    console.log(`signature ${signature}, burned asset: ${asset.publicKey}`);
  } catch (error) {
    console.log("error", error);
  }
})();
