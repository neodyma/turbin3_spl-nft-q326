import {
  address,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import wallet from "../../devnet-wallet.json";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com"
);

const token_decimals = 1_000_000n;

// mint address from spl_init.ts
const mint = address("5w7HrxgaP962bm4ADxdpn77jPmcBiSaxW68TPTCWNLtu");

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

    const [ata] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    // FHGpQBnJzaa1MayyUhyNpUgFXC7M6T8XjeL6H4ZAFFgZ
    console.log(`Your ata is : ${ata}`);

    const createAtaIx = await getCreateAssociatedTokenInstructionAsync({
      payer: signer,
      ata,
      owner: signer.address,
      mint,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    const mintToIx = getMintToInstruction({
      mint,
      token: ata,
      mintAuthority: signer.address,
      amount: BigInt(1) * token_decimals,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, mintToIx],
      msgWithLiftime
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    // LihobwbhjGxmMpJXuSqmnhxqhKJkAthAzBng9KtqxqUm8DfsrsqNfoiy2jZxJS3Eqmq8RPXu1wyNzMzsMqdEruP
    // 4U8E3uu3RMuMDuf7a67KuNprQhpZ8Bkirj5ovAiSZX3EZ85k49eV9VggZGvDf9NG4vGW9N9RyQiSaF9wQgaRYpvq
    console.log(`mint tx sig: ${signature}`);
  } catch (error) {
    console.log(error);
  }
})();
