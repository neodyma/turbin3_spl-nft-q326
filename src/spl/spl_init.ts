import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithBlockhashLifetime,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

// wallets
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com"
);

const sendAndConfirm = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const mint = await generateKeyPairSigner();

    const rentExemptionBalance = await rpc
      .getMinimumBalanceForRentExemption(BigInt(getMintSize()))
      .send();

    const blockhash = (await rpc.getLatestBlockhash().send()).value;

    const msg = createTransactionMessage({ version: 0 });
    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);
    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      blockhash,
      msgWithPayer
    );

    const txMessage = appendTransactionMessageInstructions(
      [
        getCreateAccountInstruction({
          payer: signer,
          newAccount: mint,
          lamports: rentExemptionBalance,
          space: BigInt(getMintSize()),
          programAddress: TOKEN_PROGRAM_ADDRESS,
        }),
        getInitializeMintInstruction({
          mint: mint.address,
          decimals: 6,
          mintAuthority: signer.address,
        }),
      ],
      msgWithLiftime
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const sig = getSignatureFromTransaction(signedTx);

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    // mint address: 5w7HrxgaP962bm4ADxdpn77jPmcBiSaxW68TPTCWNLtu. Signature: 2dprGBMDy81kTpc5XkfUrSBCzrXsQPT3p2UAvfrwfPfWWfC6KZQqPh7yCRgjFe41RLjiCq6di4CEYpUHKwuQiK3v
    console.log(`mint address: ${mint.address}. Signature: ${sig}`);
  } catch (error) {
    console.log(error);
  }
})();
