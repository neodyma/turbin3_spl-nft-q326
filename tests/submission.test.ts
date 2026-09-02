import { describe, expect, test } from "vitest";
import { address, createSolanaRpc, signature } from "@solana/kit";
import {
  fetchMint,
  fetchToken,
  getInitializeMintInstructionDataDecoder,
  getMintToInstructionDataDecoder,
  getTransferCheckedInstructionDataDecoder,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  getBurnV1InstructionDataSerializer,
  getCreateV2InstructionDataSerializer,
  getTransferV1InstructionDataSerializer,
  getUpdateV2InstructionDataSerializer,
  MPL_CORE_PROGRAM_ID,
} from "@metaplex-foundation/mpl-core";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const TEST_TIMEOUT = 30_000;

const rpc = createSolanaRpc(RPC_URL);

const SPL_MINT = address("5w7HrxgaP962bm4ADxdpn77jPmcBiSaxW68TPTCWNLtu");
const SPL_OWNER = address("1X4w38L9Hu84LF5b75YmoAZgFkPew32ppD6vEuaXJHq");
const SPL_OWNER_ATA = address("FHGpQBnJzaa1MayyUhyNpUgFXC7M6T8XjeL6H4ZAFFgZ");
const NEW_OWNER = address("Be5dKMH4cQvzgc5iJnzyUFz4mNePKdvastHNgcFwfEg9");
const NEW_OWNER_ATA = address("5WRYFJuXdL7qCoeaPbSdwFzZQtq2w7pPUHjUhzHwmCaw");

const NFT_ASSET_ADDRESS = "FWXC16Huqhc3VUcKnFb8EoaZhUaNAbDhsA42NjWfWrJ6";
const INITIAL_METADATA_URI =
  "https://gateway.irys.xyz/8MNLwLPT3szuDsj925G8gSZgFVZg3v4hY9dWA4K6qaBP";
const UPDATED_METADATA_URI =
  "https://gateway.irys.xyz/NZQJJzhLUYHjVyvHNU4ThxKJk8otVa3xeTcWhVkvFiS";

const transactions = {
  splInit:
    "2dprGBMDy81kTpc5XkfUrSBCzrXsQPT3p2UAvfrwfPfWWfC6KZQqPh7yCRgjFe41RLjiCq6di4CEYpUHKwuQiK3v",
  splMintInitial:
    "LihobwbhjGxmMpJXuSqmnhxqhKJkAthAzBng9KtqxqUm8DfsrsqNfoiy2jZxJS3Eqmq8RPXu1wyNzMzsMqdEruP",
  splMintTopUp:
    "4U8E3uu3RMuMDuf7a67KuNprQhpZ8Bkirj5ovAiSZX3EZ85k49eV9VggZGvDf9NG4vGW9N9RyQiSaF9wQgaRYpvq",
  splTransfer:
    "49sqxuG1XKAevPUDCoxj7G4GpSNFiB7omikbqXypN4KSzHyJrFqDz6ifUAN1dG9hpYFCsb1GXgfzKCkBtaPf5mrz",
  nftMint:
    "mpTZ9Rk6RvzFYWX1nu9vu8EyXdEK7UwH5kXdUnwJpaqfCUEbx9g1dQLTgRKYCugG3DtH15uqPGehPhJM8rMTbxK",
  nftUpdate:
    "L2yZG9dEBAQYgJiL9YtXZXWmVZJdTG7ZNx9rGArDDAEGHrpbYSfxRY3kYW98pRJZY29MjBZUBLFEpDgAVNVbYm9",
  nftTransfer:
    "29dxVunCc95yqkR6HS9DsL1xMt3gmDzrNBFX7vBKY8Lgz25m9u8wVe7ivpKvniKwC6TfGE84F5pEKJjK8ZBuWcjM",
  nftBurn:
    "3WJCXgssNrHoRTUwB2E6jcUHAtGJqEo8iVr2dMRwCXdePhGHB6Cn8xmk67thGF5Gnqxgf5i6av6rGTDLCqdt8ghy",
} as const;

type CoreMetadata = {
  name: string;
  description: string;
  image: string;
  category: string;
  properties?: {
    files?: Array<{ uri: string; type: string }>;
  };
};

async function fetchMetadata(uri: string): Promise<CoreMetadata> {
  const response = await fetch(uri);
  expect(response.ok, `metadata request failed: ${uri}`).toBe(true);
  return (await response.json()) as CoreMetadata;
}

async function fetchSuccessfulTransaction(value: string) {
  const transaction = await rpc
    .getTransaction(signature(value), {
      commitment: "finalized",
      encoding: "json",
      maxSupportedTransactionVersion: 0,
    })
    .send();

  expect(transaction, `transaction was not found: ${value}`).not.toBeNull();
  expect(transaction?.meta?.err, `transaction failed: ${value}`).toBeNull();
  return transaction!;
}

type SuccessfulTransaction = Awaited<
  ReturnType<typeof fetchSuccessfulTransaction>
>;

function accountKeys(transaction: SuccessfulTransaction): string[] {
  const loadedAddresses = transaction.meta?.loadedAddresses;

  return [
    ...transaction.transaction.message.accountKeys,
    ...(loadedAddresses?.writable ?? []),
    ...(loadedAddresses?.readonly ?? []),
  ].map(String);
}

function signerKeys(transaction: SuccessfulTransaction): string[] {
  const { accountKeys, header } = transaction.transaction.message;
  return accountKeys.slice(0, header.numRequiredSignatures).map(String);
}

function findInstruction(
  transaction: SuccessfulTransaction,
  programAddress: string,
  label: string
) {
  const keys = accountKeys(transaction);
  const instruction = transaction.transaction.message.instructions.find(
    ({ programIdIndex }) => keys[programIdIndex] === programAddress
  );

  expect(instruction, `${label} instruction was not found`).toBeDefined();

  return {
    accounts: instruction!.accounts.map((index) => keys[index]),
    data: base58.serialize(instruction!.data),
  };
}

function tokenBalance(
  balances: NonNullable<SuccessfulTransaction["meta"]>["preTokenBalances"],
  owner: string
) {
  return balances?.find(
    (balance) =>
      String(balance.mint) === String(SPL_MINT) &&
      String(balance.owner) === owner
  );
}

describe("Turbin3 Week 1", () => {
  test(
    "Task 1 — minted 1 SPL token and transferred 0.5 to the new owner",
    async () => {
      const [initTx, initialMintTx, topUpTx, transferTx] = await Promise.all([
        fetchSuccessfulTransaction(transactions.splInit),
        fetchSuccessfulTransaction(transactions.splMintInitial),
        fetchSuccessfulTransaction(transactions.splMintTopUp),
        fetchSuccessfulTransaction(transactions.splTransfer),
      ]);

      const initializeMintInstruction = findInstruction(
        initTx,
        TOKEN_PROGRAM_ADDRESS,
        "InitializeMint"
      );
      const initializeMint =
        getInitializeMintInstructionDataDecoder().decode(
          initializeMintInstruction.data
        );

      expect(initializeMintInstruction.accounts[0]).toBe(String(SPL_MINT));
      expect(signerKeys(initTx)).toEqual([
        String(SPL_OWNER),
        String(SPL_MINT),
      ]);
      expect(initializeMint.decimals).toBe(6);
      expect(String(initializeMint.mintAuthority)).toBe(String(SPL_OWNER));

      const initialMintInstruction = findInstruction(
        initialMintTx,
        TOKEN_PROGRAM_ADDRESS,
        "initial MintTo"
      );
      const initialMint = getMintToInstructionDataDecoder().decode(
        initialMintInstruction.data
      );
      expect(initialMintInstruction.accounts.slice(0, 3)).toEqual([
        String(SPL_MINT),
        String(SPL_OWNER_ATA),
        String(SPL_OWNER),
      ]);
      expect(initialMint.amount).toBe(1n);

      const topUpInstruction = findInstruction(
        topUpTx,
        TOKEN_PROGRAM_ADDRESS,
        "top-up MintTo"
      );
      const topUp = getMintToInstructionDataDecoder().decode(
        topUpInstruction.data
      );
      expect(topUpInstruction.accounts.slice(0, 3)).toEqual([
        String(SPL_MINT),
        String(SPL_OWNER_ATA),
        String(SPL_OWNER),
      ]);
      expect(topUp.amount).toBe(999_999n);
      expect(initialMint.amount + topUp.amount).toBe(1_000_000n);

      const transferInstruction = findInstruction(
        transferTx,
        TOKEN_PROGRAM_ADDRESS,
        "TransferChecked"
      );
      const transfer = getTransferCheckedInstructionDataDecoder().decode(
        transferInstruction.data
      );
      expect(transferInstruction.accounts.slice(0, 4)).toEqual([
        String(SPL_OWNER_ATA),
        String(SPL_MINT),
        String(NEW_OWNER_ATA),
        String(SPL_OWNER),
      ]);
      expect(signerKeys(transferTx)).toContain(String(SPL_OWNER));
      expect(transfer.amount).toBe(500_000n);
      expect(transfer.decimals).toBe(6);

      const preSender = tokenBalance(
        transferTx.meta!.preTokenBalances,
        String(SPL_OWNER)
      );
      const preRecipient = tokenBalance(
        transferTx.meta!.preTokenBalances,
        String(NEW_OWNER)
      );
      const postSender = tokenBalance(
        transferTx.meta!.postTokenBalances,
        String(SPL_OWNER)
      );
      const postRecipient = tokenBalance(
        transferTx.meta!.postTokenBalances,
        String(NEW_OWNER)
      );

      expect(preSender?.uiTokenAmount.amount).toBe("1000000");
      expect(preRecipient).toBeUndefined();
      expect(postSender?.uiTokenAmount.amount).toBe("500000");
      expect(postRecipient?.uiTokenAmount.amount).toBe("500000");

      const [mint, ownerAccount, newOwnerAccount] = await Promise.all([
        fetchMint(rpc, SPL_MINT, { commitment: "finalized" }),
        fetchToken(rpc, SPL_OWNER_ATA, { commitment: "finalized" }),
        fetchToken(rpc, NEW_OWNER_ATA, { commitment: "finalized" }),
      ]);

      expect(mint.data.isInitialized).toBe(true);
      expect(mint.data.decimals).toBe(6);
      expect(mint.data.supply).toBe(1_000_000n);
      expect(ownerAccount.data).toMatchObject({
        mint: SPL_MINT,
        owner: SPL_OWNER,
        amount: 500_000n,
      });
      expect(newOwnerAccount.data).toMatchObject({
        mint: SPL_MINT,
        owner: NEW_OWNER,
        amount: 500_000n,
      });
    },
    TEST_TIMEOUT
  );

  test(
    "Task 2 — minted the MPL Core NFT with its original metadata",
    async () => {
      const transaction = await fetchSuccessfulTransaction(
        transactions.nftMint
      );
      const instruction = findInstruction(
        transaction,
        String(MPL_CORE_PROGRAM_ID),
        "CreateV2"
      );
      const [create] =
        getCreateV2InstructionDataSerializer().deserialize(instruction.data);

      expect(instruction.accounts.slice(0, 6)).toEqual([
        NFT_ASSET_ADDRESS,
        String(MPL_CORE_PROGRAM_ID),
        String(MPL_CORE_PROGRAM_ID),
        String(SPL_OWNER),
        String(SPL_OWNER),
        String(SPL_OWNER),
      ]);
      expect(signerKeys(transaction)).toEqual([
        String(SPL_OWNER),
        NFT_ASSET_ADDRESS,
      ]);
      expect(create).toMatchObject({
        discriminator: 20,
        dataState: 0,
        name: "Watch Lions #000",
        uri: INITIAL_METADATA_URI,
        plugins: { __option: "Some", value: [] },
        externalPluginAdapters: { __option: "Some", value: [] },
      });

      const metadata = await fetchMetadata(INITIAL_METADATA_URI);
      expect(metadata).toMatchObject({
        name: "Watch Lions #000",
        description: "A legendary watcher lion with piercing glare",
        category: "image",
      });
      expect(metadata.image).toMatch(/^https:\/\/gateway\.irys\.xyz\//);
      expect(metadata.properties?.files).toContainEqual({
        uri: metadata.image,
        type: "image/png",
      });
    },
    TEST_TIMEOUT
  );

  test(
    "Task 3 — updated the NFT name suffix and metadata from #000 to #00",
    async () => {
      const transaction = await fetchSuccessfulTransaction(
        transactions.nftUpdate
      );
      const instruction = findInstruction(
        transaction,
        String(MPL_CORE_PROGRAM_ID),
        "UpdateV2"
      );
      const [update] =
        getUpdateV2InstructionDataSerializer().deserialize(instruction.data);

      expect(instruction.accounts[0]).toBe(NFT_ASSET_ADDRESS);
      expect(instruction.accounts.slice(2, 4)).toEqual([
        String(SPL_OWNER),
        String(SPL_OWNER),
      ]);
      expect(signerKeys(transaction)).toEqual([String(SPL_OWNER)]);
      expect(update).toMatchObject({
        discriminator: 30,
        newName: { __option: "Some", value: "Watch Lions #00" },
        newUri: { __option: "Some", value: UPDATED_METADATA_URI },
        newUpdateAuthority: { __option: "None" },
      });

      const [initialMetadata, updatedMetadata] = await Promise.all([
        fetchMetadata(INITIAL_METADATA_URI),
        fetchMetadata(UPDATED_METADATA_URI),
      ]);

      expect(initialMetadata.name).toBe("Watch Lions #000");
      expect(updatedMetadata).toEqual({
        ...initialMetadata,
        name: "Watch Lions #00",
      });
    },
    TEST_TIMEOUT
  );

  test(
    "Task 4 — transferred NFT ownership to the new-owner wallet",
    async () => {
      const transaction = await fetchSuccessfulTransaction(
        transactions.nftTransfer
      );
      const instruction = findInstruction(
        transaction,
        String(MPL_CORE_PROGRAM_ID),
        "TransferV1"
      );
      const [transfer] =
        getTransferV1InstructionDataSerializer().deserialize(instruction.data);

      expect(instruction.accounts[0]).toBe(NFT_ASSET_ADDRESS);
      expect(instruction.accounts.slice(2, 5)).toEqual([
        String(SPL_OWNER),
        String(SPL_OWNER),
        String(NEW_OWNER),
      ]);
      expect(signerKeys(transaction)).toEqual([String(SPL_OWNER)]);
      expect(transfer).toEqual({
        discriminator: 14,
        compressionProof: { __option: "None" },
      });
    },
    TEST_TIMEOUT
  );

  test(
    "Task 5 — burned the NFT as the new owner",
    async () => {
      const transaction = await fetchSuccessfulTransaction(
        transactions.nftBurn
      );
      const instruction = findInstruction(
        transaction,
        String(MPL_CORE_PROGRAM_ID),
        "BurnV1"
      );
      const [burn] =
        getBurnV1InstructionDataSerializer().deserialize(instruction.data);

      expect(instruction.accounts[0]).toBe(NFT_ASSET_ADDRESS);
      expect(instruction.accounts.slice(2, 4)).toEqual([
        String(NEW_OWNER),
        String(NEW_OWNER),
      ]);
      expect(signerKeys(transaction)).toEqual([String(NEW_OWNER)]);
      expect(burn).toEqual({
        discriminator: 12,
        compressionProof: { __option: "None" },
      });

      const keys = accountKeys(transaction);
      const assetIndex = keys.indexOf(NFT_ASSET_ADDRESS);
      const ownerIndex = keys.indexOf(String(NEW_OWNER));
      expect(assetIndex).toBeGreaterThanOrEqual(0);
      expect(ownerIndex).toBeGreaterThanOrEqual(0);

      const assetRentReleased =
        transaction.meta!.preBalances[assetIndex] -
        transaction.meta!.postBalances[assetIndex];
      const ownerBalanceIncrease =
        transaction.meta!.postBalances[ownerIndex] -
        transaction.meta!.preBalances[ownerIndex];

      expect(assetRentReleased).toBeGreaterThan(0n);
      expect(ownerBalanceIncrease).toBeGreaterThan(0n);
      expect(assetRentReleased).toBe(
        ownerBalanceIncrease + transaction.meta!.fee
      );

      const burnedAsset = await rpc
        .getAccountInfo(address(NFT_ASSET_ADDRESS), {
          commitment: "finalized",
          encoding: "base64",
        })
        .send();
      expect(burnedAsset.value).toMatchObject({
        data: ["AA==", "base64"],
        executable: false,
        lamports: transaction.meta!.postBalances[assetIndex],
        owner: String(MPL_CORE_PROGRAM_ID),
        space: 1n,
      });
    },
    TEST_TIMEOUT
  );
});
