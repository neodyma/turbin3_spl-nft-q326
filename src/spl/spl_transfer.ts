import {
  address,
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
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com"
);

// mint address from spl_init.ts
const mint = address("5w7HrxgaP962bm4ADxdpn77jPmcBiSaxW68TPTCWNLtu");

// recipient wallet pubkey
const to = address("Be5dKMH4cQvzgc5iJnzyUFz4mNePKdvastHNgcFwfEg9");

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const [fromAta] = await findAssociatedTokenPda({
      mint,
      owner: signer.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    // FHGpQBnJzaa1MayyUhyNpUgFXC7M6T8XjeL6H4ZAFFgZ
    console.log(`Your fromAta is : ${fromAta}`);

    const [toAta] = await findAssociatedTokenPda({
      mint,
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    // 5WRYFJuXdL7qCoeaPbSdwFzZQtq2w7pPUHjUhzHwmCaw
    console.log(`Your toAta is : ${toAta}`);

    const createAtaIx = await getCreateAssociatedTokenInstructionAsync({
      payer: signer,
      ata: toAta,
      owner: to,
      mint,
    });

    const transferTx = getTransferCheckedInstruction({
      source: fromAta,
      destination: toAta,
      mint,
      authority: signer.address,
      amount: 5 * 10 ** 5, // half of what we minted
      decimals: 6,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLiftime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer
    );

    const txMessage = appendTransactionMessageInstructions(
      [createAtaIx, transferTx],
      msgWithLiftime
    );

    const signedTx = await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    await sendAndConfirm(signedTx, { commitment: "confirmed" });

    // 49sqxuG1XKAevPUDCoxj7G4GpSNFiB7omikbqXypN4KSzHyJrFqDz6ifUAN1dG9hpYFCsb1GXgfzKCkBtaPf5mrz
    console.log(`mint tx sig: ${signature}`);
  } catch (error) {
    console.log(error);
  }
})();
