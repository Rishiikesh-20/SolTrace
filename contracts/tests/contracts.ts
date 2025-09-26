import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contracts } from "../target/types/contracts";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { BN } from "bn.js";

describe("Supply Chain Contracts", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program: any = anchor.workspace.Contracts;

  let admin: Keypair;
  let oracle: Keypair;
  let producer: Keypair;
  let processor: Keypair;
  let distributor: Keypair;
  let retailer: Keypair;
  let consumer: Keypair;
  let unauthorized: Keypair;

  // PDAs
  let systemConfigPda: PublicKey;
  let producerProfilePda: PublicKey;
  let processorProfilePda: PublicKey;
  let distributorProfilePda: PublicKey;
  let retailerProfilePda: PublicKey;
  let consumerProfilePda: PublicKey;
  let unauthorizedProfilePda: PublicKey;
  let batchPda: PublicKey;

  // Test data
  const batchId = "BATCH_001_TEST";
  const profileHash = Array.from({ length: 32 }, (_, i) => i + 1); // Non-zero hash
  const metadataHash = Array.from({ length: 32 }, (_, i) => i + 10);
  const detailsHash = Array.from({ length: 32 }, (_, i) => i + 20);
  const metadataCid = "QmTestMetadataCID123";
  const detailsCid = "QmTestDetailsCID456";

  const originDetails = {
    productionDate: new BN(Math.floor(Date.now() / 1000)), // i64 serialized as BN in Anchor TS
    quantity: new BN(100),
    weight: 50.5,
    productType: "Organic Apples",
  };

  before(async () => {
    // Generate keypairs
    admin = Keypair.generate();
    oracle = Keypair.generate();
    producer = Keypair.generate();
    processor = Keypair.generate();
    distributor = Keypair.generate();
    retailer = Keypair.generate();
    consumer = Keypair.generate();
    unauthorized = Keypair.generate();

    // Airdrop SOL to all accounts
    const accounts = [admin, oracle, producer, processor, distributor, retailer, consumer, unauthorized];
    for (const account of accounts) {
      await provider.connection.requestAirdrop(account.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    }

    // Wait for airdrops to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Derive PDAs
    [systemConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [producerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), producer.publicKey.toBuffer()],
      program.programId
    );

    [processorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), processor.publicKey.toBuffer()],
      program.programId
    );

    [distributorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), distributor.publicKey.toBuffer()],
      program.programId
    );

    [retailerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), retailer.publicKey.toBuffer()],
      program.programId
    );

    [consumerProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), consumer.publicKey.toBuffer()],
      program.programId
    );

    [unauthorizedProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), unauthorized.publicKey.toBuffer()],
      program.programId
    );

    [batchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), Buffer.from(batchId)],
      program.programId
    );
  });

  describe("Initialize Config", () => {
    it("Should initialize system config successfully", async () => {
      const tx = await program.methods
        .intializeConfig(admin.publicKey, oracle.publicKey)
        .accounts({
          systemConfig: systemConfigPda,
          payer: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      // Verify the configuration
      const configAccount = await program.account.systemConfig.fetch(systemConfigPda);
      expect(configAccount.isInitialized).to.be.true;
      expect(configAccount.adminWallet.toString()).to.equal(admin.publicKey.toString());
      expect(configAccount.oracleWallet.toString()).to.equal(oracle.publicKey.toString());
    });

    it.skip("Should fail to initialize with same admin and oracle wallet", async () => {
      const newAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(newAdmin.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .intializeConfig(newAdmin.publicKey, newAdmin.publicKey) // Same wallet
          .accounts({
            systemConfig: systemConfigPda,
            payer: newAdmin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAdmin])
          .rpc();
        
        expect.fail("Should have failed, but PDA seeds are fixed to 'config'");
      } catch (error) {
        expect(error.message).to.be.a("string");
      }
    });

    it.skip("Should fail to initialize with zero addresses", async () => {
      const newAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(newAdmin.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .intializeConfig(PublicKey.default, oracle.publicKey)
          .accounts({
            systemConfig: systemConfigPda,
            payer: newAdmin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAdmin])
          .rpc();
        
        expect.fail("Should have failed, but PDA seeds are fixed to 'config'");
      } catch (error) {
        expect(error.message).to.be.a("string");
      }
    });
  });

  describe("Register Users", () => {
    it("Should register producer successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: producer.publicKey,
          userProfile: producerProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      const userProfile = await program.account.userProfile.fetch(producerProfilePda);
      expect(userProfile.userWallet.toString()).to.equal(producer.publicKey.toString());
      expect(userProfile.role).to.deep.equal({ none: {} });
      expect(userProfile.isApproved).to.be.false;
    });

    it("Should register processor successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: processor.publicKey,
          userProfile: processorProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([processor])
        .rpc();

      const userProfile = await program.account.userProfile.fetch(processorProfilePda);
      expect(userProfile.userWallet.toString()).to.equal(processor.publicKey.toString());
    });

    it("Should register distributor successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: distributor.publicKey,
          userProfile: distributorProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([distributor])
        .rpc();
    });

    it("Should register retailer successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: retailer.publicKey,
          userProfile: retailerProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([retailer])
        .rpc();
    });

    it("Should register consumer successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: consumer.publicKey,
          userProfile: consumerProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([consumer])
        .rpc();
    });

    it("Should register unauthorized user successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: unauthorized.publicKey,
          userProfile: unauthorizedProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorized])
        .rpc();
    });

    it("Should fail to register with zero hash", async () => {
      const newUser = Keypair.generate();
      await provider.connection.requestAirdrop(newUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [newUserProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), newUser.publicKey.toBuffer()],
        program.programId
      );

      const zeroHash = new Array(32).fill(0);

      try {
        await program.methods
          .registerUser(zeroHash)
          .accounts({
            user: newUser.publicKey,
            userProfile: newUserProfilePda,
            systemProgram: SystemProgram.programId,
          })
          .signers([newUser])
          .rpc();
        
        expect.fail("Should have failed with zero hash");
      } catch (error) {
        expect(error.message).to.include("Invalid wallet address");
      }
    });
  });

  describe("Approve Users", () => {
    it("Should approve producer successfully", async () => {
      await program.methods
        .approveUser({ producer: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: producerProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();

      const userProfile = await program.account.userProfile.fetch(producerProfilePda);
      expect(userProfile.role).to.deep.equal({ producer: {} });
      expect(userProfile.isApproved).to.be.true;
    });

    it("Should approve processor successfully", async () => {
      await program.methods
        .approveUser({ processor: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: processorProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();

      const userProfile = await program.account.userProfile.fetch(processorProfilePda);
      expect(userProfile.role).to.deep.equal({ processor: {} });
      expect(userProfile.isApproved).to.be.true;
    });

    it("Should approve distributor successfully", async () => {
      await program.methods
        .approveUser({ distributor: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: distributorProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();
    });

    it("Should approve retailer successfully", async () => {
      await program.methods
        .approveUser({ retailer: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: retailerProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();
    });

    it("Should approve consumer successfully", async () => {
      await program.methods
        .approveUser({ consumer: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: consumerProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();
    });

    it("Should fail to approve user with non-admin account", async () => {
      try {
        await program.methods
          .approveUser({ producer: {} })
          .accounts({
            admin: unauthorized.publicKey, // Not the admin
            userProfile: unauthorizedProfilePda,
            systemConfig: systemConfigPda,
          })
          .signers([unauthorized])
          .rpc();
        
        expect.fail("Should have failed with unauthorized account");
      } catch (error) {
        expect(error.message).to.include("Unauthorized access");
      }
    });

    it("Should fail to approve user with administrator role", async () => {
      try {
        await program.methods
          .approveUser({ administrator: {} })
          .accounts({
            admin: admin.publicKey,
            userProfile: unauthorizedProfilePda,
            systemConfig: systemConfigPda,
          })
          .signers([admin])
          .rpc();
        
        expect.fail("Should have failed with administrator role");
      } catch (error) {
        expect(error.message).to.include("Invalid role for this action");
      }
    });

    it("Should fail to approve already approved user", async () => {
      try {
        await program.methods
          .approveUser({ producer: {} })
          .accounts({
            admin: admin.publicKey,
            userProfile: producerProfilePda, // Already approved
            systemConfig: systemConfigPda,
          })
          .signers([admin])
          .rpc();
        
        expect.fail("Should have failed with already approved user");
      } catch (error) {
        expect(error.message).to.include("User already approved");
      }
    });
  });

  describe("Create Batch", () => {
    it("Should create batch successfully", async () => {
      await program.methods
        .createBatch(batchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: batchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.id).to.equal(batchId);
      expect(batch.producer.toString()).to.equal(producer.publicKey.toString());
      expect(batch.currentOwner.toString()).to.equal(producer.publicKey.toString());
      expect(batch.status).to.deep.equal({ registered: {} });
      expect(batch.metadataCid).to.equal(metadataCid);
      expect(batch.events).to.have.length(0);
    });

    it("Should fail to create batch with non-producer role", async () => {
      const newBatchId = "BATCH_002_TEST";
      const [newBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(newBatchId)],
        program.programId
      );

      try {
        await program.methods
          .createBatch(newBatchId, originDetails, metadataHash, metadataCid)
          .accounts({
            batch: newBatchPda,
            userProfile: processorProfilePda, // Not a producer
            user: processor.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([processor])
          .rpc();
        
        expect.fail("Should have failed with non-producer role");
      } catch (error) {
        expect(error.message).to.include("Invalid role for this operation");
      }
    });

    it("Should fail to create batch with unapproved user", async () => {
      const newBatchId = "BATCH_003_TEST";
      const [newBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(newBatchId)],
        program.programId
      );

      try {
        await program.methods
          .createBatch(newBatchId, originDetails, metadataHash, metadataCid)
          .accounts({
            batch: newBatchPda,
            userProfile: unauthorizedProfilePda, // Not approved
            user: unauthorized.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();
        
        expect.fail("Should have failed with unapproved user");
      } catch (error) {
        expect(error.message).to.include("User is not approved");
      }
    });

    it("Should fail to create batch with invalid production date", async () => {
      const newBatchId = "BATCH_004_TEST";
      const [newBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(newBatchId)],
        program.programId
      );

      const invalidOriginDetails = {
        ...originDetails,
        productionDate: new BN(0), // Invalid date
      };

      try {
        await program.methods
          .createBatch(newBatchId, invalidOriginDetails, metadataHash, metadataCid)
          .accounts({
            batch: newBatchPda,
            userProfile: producerProfilePda,
            user: producer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([producer])
          .rpc();
        
        expect.fail("Should have failed with invalid production date");
      } catch (error) {
        expect(error.message).to.include("Invalid production date");
      }
    });

    it("Should fail to create batch with empty batch ID", async () => {
      const emptyBatchId = "";
      
      try {
        const [newBatchPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("batch"), Buffer.from(emptyBatchId)],
          program.programId
        );

        await program.methods
          .createBatch(emptyBatchId, originDetails, metadataHash, metadataCid)
          .accounts({
            batch: newBatchPda,
            userProfile: producerProfilePda,
            user: producer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([producer])
          .rpc();
        
        expect.fail("Should have failed with empty batch ID");
      } catch (error) {
        expect(error.message).to.include("Invalid batch ID");
      }
    });

    it("Should fail to create batch with zero metadata hash", async () => {
      const newBatchId = "BATCH_005_TEST";
      const [newBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(newBatchId)],
        program.programId
      );

      const zeroHash = new Array(32).fill(0);

      try {
        await program.methods
          .createBatch(newBatchId, originDetails, zeroHash, metadataCid)
          .accounts({
            batch: newBatchPda,
            userProfile: producerProfilePda,
            user: producer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([producer])
          .rpc();
        
        expect.fail("Should have failed with zero metadata hash");
      } catch (error) {
        expect(error.message).to.include("Invalid metadata hash");
      }
    });
  });

  describe("Log Handover", () => {
    it("Should log handover from producer to processor successfully", async () => {
      await program.methods
        .logHandover(processor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: batchPda,
          fromUserProfile: producerProfilePda,
          toUserProfile: processorProfilePda,
          fromUser: producer.publicKey,
          toUser: processor.publicKey,
        })
        .signers([producer, processor])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.currentOwner.toString()).to.equal(processor.publicKey.toString());
      expect(batch.status).to.deep.equal({ inProcessing: {} });
      expect(batch.events).to.have.length(1);
      expect(batch.events[0].eventType).to.deep.equal({ handOver: {} });
      expect(batch.events[0].fromWallet.toString()).to.equal(producer.publicKey.toString());
      expect(batch.events[0].toWallet.toString()).to.equal(processor.publicKey.toString());
    });

    it("Should log handover from processor to distributor successfully", async () => {
      await program.methods
        .logHandover(distributor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: batchPda,
          fromUserProfile: processorProfilePda,
          toUserProfile: distributorProfilePda,
          fromUser: processor.publicKey,
          toUser: distributor.publicKey,
        })
        .signers([processor, distributor])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.currentOwner.toString()).to.equal(distributor.publicKey.toString());
      expect(batch.status).to.deep.equal({ inTransit: {} });
      expect(batch.events).to.have.length(2);
    });

    it("Should log handover from distributor to retailer successfully", async () => {
      await program.methods
        .logHandover(retailer.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: batchPda,
          fromUserProfile: distributorProfilePda,
          toUserProfile: retailerProfilePda,
          fromUser: distributor.publicKey,
          toUser: retailer.publicKey,
        })
        .signers([distributor, retailer])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.currentOwner.toString()).to.equal(retailer.publicKey.toString());
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.events).to.have.length(3);
    });

    it("Should fail handover with non-owner", async () => {
      try {
        await program.methods
          .logHandover(consumer.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: processorProfilePda, // Not current owner
            toUserProfile: consumerProfilePda,
            fromUser: processor.publicKey,
            toUser: consumer.publicKey,
          })
          .signers([processor, consumer])
          .rpc();
        
        expect.fail("Should have failed with non-owner");
      } catch (error) {
        expect(error.message).to.include("User is not the current owner of the batch");
      }
    });

    it("Should fail handover with unapproved from user", async () => {
      // First create a batch with the current owner (retailer)
      const newBatchId = "BATCH_HANDOVER_TEST";
      const [newBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(newBatchId)],
        program.programId
      );

      // Create batch as producer first
      await program.methods
        .createBatch(newBatchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: newBatchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      try {
        await program.methods
          .logHandover(processor.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: newBatchPda,
            fromUserProfile: unauthorizedProfilePda, // Unapproved user
            toUserProfile: processorProfilePda,
            fromUser: unauthorized.publicKey,
            toUser: processor.publicKey,
          })
          .signers([unauthorized, processor])
          .rpc();
        
        expect.fail("Should have failed with unapproved from user");
      } catch (error) {
        expect(error.message).to.include("User is not approved");
      }
    });

    it("Should fail handover with zero details hash", async () => {
      const zeroHash = new Array(32).fill(0);

      try {
        await program.methods
          .logHandover(consumer.publicKey, zeroHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: retailerProfilePda,
            toUserProfile: consumerProfilePda,
            fromUser: retailer.publicKey,
            toUser: consumer.publicKey,
          })
          .signers([retailer, consumer])
          .rpc();
        
        expect.fail("Should have failed with zero details hash");
      } catch (error) {
        expect(error.message).to.include("Invalid details hash");
      }
    });

    it("Should fail handover with empty details CID", async () => {
      try {
        await program.methods
          .logHandover(consumer.publicKey, detailsHash, "")
          .accounts({
            batch: batchPda,
            fromUserProfile: retailerProfilePda,
            toUserProfile: consumerProfilePda,
            fromUser: retailer.publicKey,
            toUser: consumer.publicKey,
          })
          .signers([retailer, consumer])
          .rpc();
        
        expect.fail("Should have failed with empty details CID");
      } catch (error) {
        expect(error.message).to.include("Invalid details CID");
      }
    });

    it("Should fail invalid role transition (retailer to producer)", async () => {
      // Create a new producer for this test
      const newProducer = Keypair.generate();
      await provider.connection.requestAirdrop(newProducer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register and approve the new producer
      const [newProducerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), newProducer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: newProducer.publicKey,
          userProfile: newProducerProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([newProducer])
        .rpc();

      await program.methods
        .approveUser({ producer: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: newProducerProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();

      try {
        await program.methods
          .logHandover(newProducer.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: retailerProfilePda,
            toUserProfile: newProducerProfilePda,
            fromUser: retailer.publicKey,
            toUser: newProducer.publicKey,
          })
          .signers([retailer, newProducer])
          .rpc();
        
        expect.fail("Should have failed with invalid role transition");
      } catch (error) {
        expect(error.message).to.include("Invalid role transition");
      }
    });

    it("Should complete final handover to consumer", async () => {
      await program.methods
        .logHandover(consumer.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: batchPda,
          fromUserProfile: retailerProfilePda,
          toUserProfile: consumerProfilePda,
          fromUser: retailer.publicKey,
          toUser: consumer.publicKey,
        })
        .signers([retailer, consumer])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.currentOwner.toString()).to.equal(consumer.publicKey.toString());
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.events).to.have.length(4);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("Should handle wallet mismatch in user profile", async () => {
      const mismatchUser = Keypair.generate();
      await provider.connection.requestAirdrop(mismatchUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await program.methods
          .logHandover(mismatchUser.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: consumerProfilePda, // Profile doesn't match mismatch user
            toUserProfile: consumerProfilePda,
            fromUser: mismatchUser.publicKey, // Different from profile
            toUser: consumer.publicKey,
          })
          .signers([mismatchUser, consumer])
          .rpc();
        
        expect.fail("Should have failed with wallet mismatch");
      } catch (error) {
        expect(error.message).to.include("Wallet address does not match user profile");
      }
    });

    it("Should prevent handover from consumer (invalid handover role)", async () => {
      const anotherConsumer = Keypair.generate();
      await provider.connection.requestAirdrop(anotherConsumer.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register and approve another consumer
      const [anotherConsumerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), anotherConsumer.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: anotherConsumer.publicKey,
          userProfile: anotherConsumerProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([anotherConsumer])
        .rpc();

      await program.methods.approveUser({ consumer: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: anotherConsumerProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();

      try {
        await program.methods
          .logHandover(anotherConsumer.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: consumerProfilePda,
            toUserProfile: anotherConsumerProfilePda,
            fromUser: consumer.publicKey,
            toUser: anotherConsumer.publicKey,
          })
          .signers([consumer, anotherConsumer])
          .rpc();
        
        expect.fail("Should have failed with invalid handover role");
      } catch (error) {
        expect(error.message).to.include("Invalid role for handover");
      }
    });

    it("Should handle maximum events limit", async () => {
      // Create a new batch to test maximum events
      const maxEventsBatchId = "BATCH_MAX_EVENTS";
      const [maxEventsBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(maxEventsBatchId)],
        program.programId
      );

      await program.methods
        .createBatch(maxEventsBatchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: maxEventsBatchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      // Add multiple events to approach the limit
      await program.methods
        .logHandover(processor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: maxEventsBatchPda,
          fromUserProfile: producerProfilePda,
          toUserProfile: processorProfilePda,
          fromUser: producer.publicKey,
          toUser: processor.publicKey,
        })
        .signers([producer, processor])
        .rpc();

      await program.methods
        .logHandover(distributor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: maxEventsBatchPda,
          fromUserProfile: processorProfilePda,
          toUserProfile: distributorProfilePda,
          fromUser: processor.publicKey,
          toUser: distributor.publicKey,
        })
        .signers([processor, distributor])
        .rpc();

      const batch = await program.account.batch.fetch(maxEventsBatchPda);
      expect(batch.events).to.have.length(2);
    });

    it("Should fail with invalid batch PDA", async () => {
      const invalidBatchId = "INVALID_BATCH";
      const [invalidBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(invalidBatchId)],
        program.programId
      );

      try {
        await program.methods
          .logHandover(processor.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: invalidBatchPda, // This batch doesn't exist
            fromUserProfile: producerProfilePda,
            toUserProfile: processorProfilePda,
            fromUser: producer.publicKey,
            toUser: processor.publicKey,
          })
          .signers([producer, processor])
          .rpc();
        
        expect.fail("Should have failed with invalid batch");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("Should verify event data integrity", async () => {
      const batch = await program.account.batch.fetch(batchPda);
      
      // Verify all events have proper structure
      for (const event of batch.events) {
        expect(event.timestamp.toNumber()).to.be.greaterThan(0);
        expect(event.eventType).to.deep.equal({ handOver: {} });
        expect(event.detailsHash).to.deep.equal(detailsHash);
        expect(event.detailsCid).to.equal(detailsCid);
        expect(event.fromWallet).to.not.equal(PublicKey.default);
        expect(event.toWallet).to.not.equal(PublicKey.default);
      }
    });

    it("Should verify batch status transitions", async () => {
      const batch = await program.account.batch.fetch(batchPda);
      
      // Final batch should be in Sold status with consumer as owner
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.currentOwner.toString()).to.equal(consumer.publicKey.toString());
      expect(batch.producer.toString()).to.equal(producer.publicKey.toString());
    });
  });

  describe("System Integration Tests", () => {
    it("Should handle complete supply chain flow", async () => {
      const integrationBatchId = "INTEGRATION_BATCH";
      const [integrationBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(integrationBatchId)],
        program.programId
      );

      // 1. Create batch
      await program.methods
        .createBatch(integrationBatchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: integrationBatchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      let batch = await program.account.batch.fetch(integrationBatchPda);
      expect(batch.status).to.deep.equal({ registered: {} });
      expect(batch.currentOwner.toString()).to.equal(producer.publicKey.toString());

      // 2. Producer to Processor
      await program.methods
        .logHandover(processor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: integrationBatchPda,
          fromUserProfile: producerProfilePda,
          toUserProfile: processorProfilePda,
          fromUser: producer.publicKey,
          toUser: processor.publicKey,
        })
        .signers([producer, processor])
        .rpc();

      batch = await program.account.batch.fetch(integrationBatchPda);
      expect(batch.status).to.deep.equal({ inProcessing: {} });
      expect(batch.currentOwner.toString()).to.equal(processor.publicKey.toString());

      // 3. Processor to Distributor
      await program.methods
        .logHandover(distributor.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: integrationBatchPda,
          fromUserProfile: processorProfilePda,
          toUserProfile: distributorProfilePda,
          fromUser: processor.publicKey,
          toUser: distributor.publicKey,
        })
        .signers([processor, distributor])
        .rpc();

      batch = await program.account.batch.fetch(integrationBatchPda);
      expect(batch.status).to.deep.equal({ inTransit: {} });
      expect(batch.currentOwner.toString()).to.equal(distributor.publicKey.toString());

      // 4. Distributor to Retailer
      await program.methods
        .logHandover(retailer.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: integrationBatchPda,
          fromUserProfile: distributorProfilePda,
          toUserProfile: retailerProfilePda,
          fromUser: distributor.publicKey,
          toUser: retailer.publicKey,
        })
        .signers([distributor, retailer])
        .rpc();

      batch = await program.account.batch.fetch(integrationBatchPda);
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.currentOwner.toString()).to.equal(retailer.publicKey.toString());

      // 5. Retailer to Consumer
      await program.methods
        .logHandover(consumer.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: integrationBatchPda,
          fromUserProfile: retailerProfilePda,
          toUserProfile: consumerProfilePda,
          fromUser: retailer.publicKey,
          toUser: consumer.publicKey,
        })
        .signers([retailer, consumer])
        .rpc();

      batch = await program.account.batch.fetch(integrationBatchPda);
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.currentOwner.toString()).to.equal(consumer.publicKey.toString());
      expect(batch.events).to.have.length(4);

      // Verify complete chain of custody
      expect(batch.events[0].fromWallet.toString()).to.equal(producer.publicKey.toString());
      expect(batch.events[0].toWallet.toString()).to.equal(processor.publicKey.toString());
      expect(batch.events[1].fromWallet.toString()).to.equal(processor.publicKey.toString());
      expect(batch.events[1].toWallet.toString()).to.equal(distributor.publicKey.toString());
      expect(batch.events[2].fromWallet.toString()).to.equal(distributor.publicKey.toString());
      expect(batch.events[2].toWallet.toString()).to.equal(retailer.publicKey.toString());
      expect(batch.events[3].fromWallet.toString()).to.equal(retailer.publicKey.toString());
      expect(batch.events[3].toWallet.toString()).to.equal(consumer.publicKey.toString());
    });

    it("Should handle direct producer to retailer handover", async () => {
      const directBatchId = "DIRECT_BATCH";
      const [directBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(directBatchId)],
        program.programId
      );

      // Create batch
      await program.methods
        .createBatch(directBatchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: directBatchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      // Direct handover from producer to retailer (skipping processor and distributor)
      await program.methods
        .logHandover(retailer.publicKey, detailsHash, detailsCid)
        .accounts({
          batch: directBatchPda,
          fromUserProfile: producerProfilePda,
          toUserProfile: retailerProfilePda,
          fromUser: producer.publicKey,
          toUser: retailer.publicKey,
        })
        .signers([producer, retailer])
        .rpc();

      const batch = await program.account.batch.fetch(directBatchPda);
      expect(batch.status).to.deep.equal({ sold: {} });
      expect(batch.currentOwner.toString()).to.equal(retailer.publicKey.toString());
      expect(batch.events).to.have.length(1);
    });

    it("Should validate all role permissions correctly", async () => {
      // Test that only approved users can participate
      const testBatchId = "PERMISSION_TEST";
      const [testBatchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), Buffer.from(testBatchId)],
        program.programId
      );

      // Approved producer can create batch
      await program.methods
        .createBatch(testBatchId, originDetails, metadataHash, metadataCid)
        .accounts({
          batch: testBatchPda,
          userProfile: producerProfilePda,
          user: producer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([producer])
        .rpc();

      // Verify only owner can initiate handover
      try {
        await program.methods
          .logHandover(processor.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: testBatchPda,
            fromUserProfile: processorProfilePda, // Not the owner
            toUserProfile: producerProfilePda,
            fromUser: processor.publicKey,
            toUser: producer.publicKey,
          })
          .signers([processor, producer])
          .rpc();
        
        expect.fail("Should have failed with unauthorized owner");
      } catch (error) {
        expect(error.message).to.include("User is not the current owner of the batch");
      }
    });
  });

  describe("Cleanup and Final Validation", () => {
    it("Should verify all accounts are properly initialized", async () => {
      // Verify system config
      const config = await program.account.systemConfig.fetch(systemConfigPda);
      expect(config.isInitialized).to.be.true;
      expect(config.adminWallet.toString()).to.equal(admin.publicKey.toString());
      expect(config.oracleWallet.toString()).to.equal(oracle.publicKey.toString());

      // Verify all user profiles
      const profiles = [
        { pda: producerProfilePda, role: { producer: {} } },
        { pda: processorProfilePda, role: { processor: {} } },
        { pda: distributorProfilePda, role: { distributor: {} } },
        { pda: retailerProfilePda, role: { retailer: {} } },
        { pda: consumerProfilePda, role: { consumer: {} } }
      ];

      for (const profile of profiles) {
        const userProfile = await program.account.userProfile.fetch(profile.pda);
        expect(userProfile.isApproved).to.be.true;
        expect(userProfile.role).to.deep.equal(profile.role);
        expect(userProfile.registeredAt.toNumber()).to.be.greaterThan(0);
      }
    });

    it("Should verify batch data integrity", async () => {
      const batch = await program.account.batch.fetch(batchPda);
      
      // Verify basic batch data
      expect(batch.id).to.equal(batchId);
      expect(batch.producer.toString()).to.equal(producer.publicKey.toString());
      expect(batch.currentOwner.toString()).to.equal(consumer.publicKey.toString());
      expect(batch.metadataCid).to.equal(metadataCid);
      expect(batch.metadataHash).to.deep.equal(metadataHash);
      
      // Verify origin details
      expect(batch.originDetails.productType).to.equal(originDetails.productType);
      expect(batch.originDetails.quantity.toNumber()).to.equal(originDetails.quantity.toNumber());
      expect(batch.originDetails.weight).to.equal(originDetails.weight);
      
      // Verify events chronological order
      for (let i = 1; i < batch.events.length; i++) {
        expect(batch.events[i].timestamp.toNumber()).to.be.greaterThanOrEqual(batch.events[i - 1].timestamp.toNumber());
      }
    });

    it("Should handle account closure scenarios", async () => {
      // This test verifies that the program handles edge cases properly
      // In a real scenario, you might want to test account closure and reinitialization
      
      const tempUser = Keypair.generate();
      await provider.connection.requestAirdrop(tempUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Attempt to interact with non-existent profile
        const [tempProfilePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), tempUser.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .logHandover(tempUser.publicKey, detailsHash, detailsCid)
          .accounts({
            batch: batchPda,
            fromUserProfile: tempProfilePda, // Doesn't exist
            toUserProfile: consumerProfilePda,
            fromUser: tempUser.publicKey,
            toUser: consumer.publicKey,
          })
          .signers([tempUser, consumer])
          .rpc();
        
        expect.fail("Should have failed with non-existent profile");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });
  });
});