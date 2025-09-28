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
  let regulator: Keypair;

  // PDAs
  let systemConfigPda: PublicKey;
  let producerProfilePda: PublicKey;
  let processorProfilePda: PublicKey;
  let distributorProfilePda: PublicKey;
  let retailerProfilePda: PublicKey;
  let consumerProfilePda: PublicKey;
  let regulatorProfilePda: PublicKey;
  let batchPda: PublicKey;
  let certificationPda: PublicKey;

  // Test data
  const batchId = "BATCH_001_TEST";
  const profileHash = Array.from({ length: 32 }, (_, i) => i + 1);
  const metadataHash = Array.from({ length: 32 }, (_, i) => i + 10);
  const detailsHash = Array.from({ length: 32 }, (_, i) => i + 20);
  const metadataCid = "QmTestMetadataCID123";
  const detailsCid = "QmTestDetailsCID456";
  const certHash = Array.from({ length: 32 }, (_, i) => i + 30);
  const certCid = "QmTestCertCID789";
  const iotHash = Array.from({ length: 32 }, (_, i) => i + 40);
  const iotCid = "QmTestIoTCID012";

  const originDetails = {
    productionDate: new BN(Math.floor(Date.now() / 1000)),
    quantity: new BN(100),
    weight: 50.5,
    productType: "Organic Apples",
  };

  const iotSummary = {
    timestamp: Math.floor(Date.now() / 1000),
    minTemp: 2.0,
    maxTemp: 8.0,
    avgTemp: 5.0,
    minHumidity: 40.0,
    maxHumidity: 60.0,
    avgHumidity: 50.0,
    locationSummary: "Warehouse A, Zone 1",
    breachDetected: false,
    breachCount: 0,
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
    regulator = Keypair.generate();

    // Airdrop SOL to all accounts
    const accounts = [admin, oracle, producer, processor, distributor, retailer, consumer, regulator];
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

    [regulatorProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), regulator.publicKey.toBuffer()],
      program.programId
    );

    [batchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), Buffer.from(batchId)],
      program.programId
    );

    [certificationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cert"), Buffer.from(batchId), Buffer.from("organic")],
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

    it("Should register regulator successfully", async () => {
      await program.methods
        .registerUser(profileHash)
        .accounts({
          user: regulator.publicKey,
          userProfile: regulatorProfilePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([regulator])
        .rpc();
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

    it("Should approve regulator successfully", async () => {
      await program.methods
        .approveUser({ regulator: {} })
        .accounts({
          admin: admin.publicKey,
          userProfile: regulatorProfilePda,
          systemConfig: systemConfigPda,
        })
        .signers([admin])
        .rpc();
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
  });

  describe("Update IoT Summary", () => {
    it("Should update IoT summary successfully", async () => {
      await program.methods
        .updateIotSummary(iotSummary, iotHash, iotCid)
        .accounts({
          batch: batchPda,
          oracle: oracle.publicKey,
          systemConfig: systemConfigPda,
        })
        .signers([oracle])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.iotSummary.timestamp).to.equal(iotSummary.timestamp);
      expect(batch.iotSummary.minTemp).to.equal(iotSummary.minTemp);
      expect(batch.iotSummary.maxTemp).to.equal(iotSummary.maxTemp);
      expect(batch.iotCid).to.equal(iotCid);
    });
  });

  describe("Check Compliance", () => {
    it("Should check compliance successfully", async () => {
      await program.methods
        .checkCompliance()
        .accounts({
          batch: batchPda,
          callerProfile: regulatorProfilePda,
          caller: regulator.publicKey,
          systemConfig: systemConfigPda,
        })
        .signers([regulator])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.compliance.certificationIssued).to.be.true;
      expect(batch.status).to.deep.equal({ compliant: {} });
    });
  });

  describe("Issue Certification", () => {
    it("Should issue certification successfully", async () => {
      await program.methods
        .issueCertification("organic", certHash, certCid)
        .accounts({
          certification: certificationPda,
          batch: batchPda,
          issuerProfile: regulatorProfilePda,
          issuer: regulator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([regulator])
        .rpc();

      const certification = await program.account.certification.fetch(certificationPda);
      expect(certification.batchId).to.equal(batchId);
      expect(certification.certType).to.equal("organic");
      expect(certification.issuer.toString()).to.equal(regulator.publicKey.toString());
      expect(certification.valid).to.be.true;
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

    it("Should log handover from retailer to consumer successfully", async () => {
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

  describe("Flag Batch", () => {
    it("Should flag batch successfully", async () => {
      const reason = "Temperature breach detected";
      
      await program.methods
        .flagBatch(reason)
        .accounts({
          batch: batchPda,
          callerProfile: regulatorProfilePda,
          caller: regulator.publicKey,
          systemConfig: systemConfigPda,
        })
        .signers([regulator])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.status).to.deep.equal({ flagged: {} });
      expect(batch.compliance.coldChainCompliant).to.be.false;
      expect(batch.events).to.have.length(5);
      expect(batch.events[4].eventType).to.deep.equal({ breachDetected: {} });
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

      // 2. Update IoT summary
      await program.methods
        .updateIotSummary(iotSummary, iotHash, iotCid)
        .accounts({
          batch: integrationBatchPda,
          oracle: oracle.publicKey,
          systemConfig: systemConfigPda,
        })
        .signers([oracle])
        .rpc();

      // 3. Check compliance
      await program.methods
        .checkCompliance()
        .accounts({
          batch: integrationBatchPda,
          callerProfile: regulatorProfilePda,
          caller: regulator.publicKey,
          systemConfig: systemConfigPda,
        })
        .signers([regulator])
        .rpc();

      // 4. Issue certification
      const [integrationCertPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("cert"), Buffer.from(integrationBatchId), Buffer.from("organic")],
        program.programId
      );

      await program.methods
        .issueCertification("organic", certHash, certCid)
        .accounts({
          certification: integrationCertPda,
          batch: integrationBatchPda,
          issuerProfile: regulatorProfilePda,
          issuer: regulator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([regulator])
        .rpc();

      // 5. Handover to processor
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

      // 6. Handover to distributor
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

      // 7. Handover to retailer
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

      // 8. Final handover to consumer
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
  });

  describe("Final Validation", () => {
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
        { pda: consumerProfilePda, role: { consumer: {} } },
        { pda: regulatorProfilePda, role: { regulator: {} } }
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
      
      // Verify IoT summary
      expect(batch.iotSummary.timestamp).to.equal(iotSummary.timestamp);
      expect(batch.iotSummary.minTemp).to.equal(iotSummary.minTemp);
      expect(batch.iotSummary.maxTemp).to.equal(iotSummary.maxTemp);
      expect(batch.iotCid).to.equal(iotCid);
      
      // Verify compliance
      expect(batch.compliance.certificationIssued).to.be.true;
      expect(batch.compliance.coldChainCompliant).to.be.false; // Flagged due to temperature breach
      
      // Verify events chronological order
      for (let i = 1; i < batch.events.length; i++) {
        expect(batch.events[i].timestamp.toNumber()).to.be.greaterThanOrEqual(batch.events[i - 1].timestamp.toNumber());
      }
    });
  });
});