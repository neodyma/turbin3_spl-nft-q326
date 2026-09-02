import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import wallet from "../../devnet-wallet.json";
import newOwnerWallet from "../../new-owner-wallet.json";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { fetchAsset, mplCore, transfer } from "@metaplex-foundation/mpl-core";
import { base58 } from "@metaplex-foundation/umi/serializers";

const umi = createUmi(
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
);

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

const newOwnerKeypair = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(newOwnerWallet)
);

umi.use(signerIdentity(signer));

umi.use(mplCore());

(async () => {
  try {
    const assetAddress = publicKey(
      "FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6"
    );

    const asset = await fetchAsset(umi, assetAddress);

    const tx = await transfer(umi, {
      asset,
      authority: signer,
      newOwner: newOwnerKeypair.publicKey,
    }).sendAndConfirm(umi);

    const signature = base58.deserialize(tx.signature)[0];

    // signature 29dxVunCc95yqkR6HS9DsL1xMt3gmDzrNBFX7vBKY8Lgz25m9u8wVe7ivpKvniKwC6TfGE84F5pEKJjK8ZBuWcjM
    // asset: FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6, new owner: Be5dKMH4cQvzgc5iJnzyUFz4mNePKdvastHNgcFwfEg9
    console.log(
      `signature ${signature}, asset: ${asset.publicKey}, new owner: ${newOwnerKeypair.publicKey}`
    );
  } catch (error) {
    console.log("error", error);
  }
})();
