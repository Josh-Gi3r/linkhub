/**
 * Digital Wallet Pass Generator
 *
 * Apple Wallet (.pkpass):
 *   APPLE_WALLET_CERT_P12      — base64-encoded .p12 certificate from Apple Developer Portal
 *   APPLE_WALLET_CERT_PASS     — passphrase for the .p12
 *   APPLE_WALLET_PASS_TYPE_ID  — Pass Type ID (e.g. pass.com.example.linkhub) — REQUIRED, no default
 *   APPLE_WALLET_TEAM_ID       — Apple Developer Team ID
 *   APPLE_WALLET_WWDR_PEM      — Apple WWDR G4 PEM from https://www.apple.com/certificateauthority/
 *
 * Google Wallet:
 *   GOOGLE_WALLET_SERVICE_ACCOUNT_JSON — full service account JSON key (stringify the JSON)
 *   GOOGLE_WALLET_ISSUER_ID            — issuer ID from Google Pay & Wallet Console
 *   WALLET_LOGO_URL                    — public URL for card logo image (optional)
 *
 * General:
 *   VITE_APP_NAME   — app/org name shown on the card (e.g. "Acme")
 *   PUBLIC_BASE_URL — deployment base URL (e.g. https://links.example.com)
 */

import { PKPass } from "passkit-generator";
import * as crypto from "crypto";
import jwt from "jsonwebtoken";

function getAppName(): string {
  return process.env.VITE_APP_NAME ?? "LinkHub";
}

function getBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL ?? "https://example.com").replace(/\/+$/, "");
}

// ─── Apple Wallet ─────────────────────────────────────────────────────────────

export interface ApplePassInput {
  displayName: string;
  jobTitle?: string | null;
  profileUrl: string;
  slug: string;
}

export async function generateApplePass(input: ApplePassInput): Promise<Buffer> {
  const certP12B64 = process.env.APPLE_WALLET_CERT_P12;
  const certPass   = process.env.APPLE_WALLET_CERT_PASS ?? "";
  const passTypeId = process.env.APPLE_WALLET_PASS_TYPE_ID;
  const teamId     = process.env.APPLE_WALLET_TEAM_ID ?? "";
  const wwdrPem    = process.env.APPLE_WALLET_WWDR_PEM;
  const appName    = getAppName();

  if (!certP12B64) {
    throw new Error(
      "APPLE_WALLET_CERT_P12 not configured. " +
        "Provide a base64-encoded .p12 certificate from Apple Developer Portal."
    );
  }
  if (!passTypeId) {
    throw new Error(
      "APPLE_WALLET_PASS_TYPE_ID not configured. " +
        "Set it to the Pass Type ID registered in Apple Developer (e.g. pass.com.example.linkhub)."
    );
  }
  if (!wwdrPem) {
    throw new Error(
      "APPLE_WALLET_WWDR_PEM not configured. " +
        "Download the Apple WWDR G4 certificate from https://www.apple.com/certificateauthority/ " +
        "and set it as a PEM string in this env var."
    );
  }

  const certBuffer   = Buffer.from(certP12B64, "base64");
  const serialNumber = crypto.randomBytes(8).toString("hex").toUpperCase();

  const pass = new PKPass(
    {},
    {
      signerCert: certBuffer,
      signerKey: certBuffer,
      signerKeyPassphrase: certPass,
      wwdr: wwdrPem,
    },
    {
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber,
      description: `${input.displayName} — Digital Card`,
      organizationName: appName,
      foregroundColor: "rgb(0, 0, 0)",
      backgroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(80, 80, 80)",
      logoText: appName,
    }
  );

  pass.type = "generic";
  pass.primaryFields.push({ key: "name", label: "NAME", value: input.displayName });
  if (input.jobTitle) {
    pass.secondaryFields.push({ key: "title", label: "TITLE", value: input.jobTitle });
  }
  pass.auxiliaryFields.push({ key: "url", label: "PROFILE", value: input.profileUrl });
  pass.backFields.push(
    {
      key: "profile",
      label: "Profile",
      value: input.profileUrl,
      attributedValue: `<a href="${input.profileUrl}">${input.profileUrl}</a>`,
    },
    { key: "powered", label: "Powered by", value: appName }
  );
  pass.setBarcodes({
    message: input.profileUrl,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: input.profileUrl,
  });

  return pass.getAsBuffer();
}

// ─── Google Wallet ────────────────────────────────────────────────────────────

export interface GooglePassInput {
  displayName: string;
  jobTitle?: string | null;
  profileUrl: string;
  slug: string;
}

export interface GooglePassResult {
  addToWalletUrl: string;
}

export function generateGoogleWalletJwt(input: GooglePassInput): GooglePassResult {
  const serviceAccountJson = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;
  const issuerId           = process.env.GOOGLE_WALLET_ISSUER_ID;
  const logoUrl            = process.env.WALLET_LOGO_URL ?? "";
  const appName            = getAppName();
  const baseUrl            = getBaseUrl();

  if (!serviceAccountJson || !issuerId) {
    throw new Error(
      "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON and GOOGLE_WALLET_ISSUER_ID are required. " +
        "Create a Google Cloud service account with Wallet API access."
    );
  }

  const sa = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };

  const appSlug  = appName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const classId  = `${issuerId}.${appSlug}-card`;
  const objectId = `${issuerId}.${appSlug}-${input.slug}-${Date.now()}`;

  const logoSection = logoUrl
    ? {
        logo: {
          sourceUri: { uri: logoUrl },
          contentDescription: { defaultValue: { language: "en-US", value: `${appName} Logo` } },
        },
      }
    : {};

  const payload = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [baseUrl],
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId,
          genericType: "GENERIC_TYPE_UNSPECIFIED",
          hexBackgroundColor: "#FFFFFF",
          ...logoSection,
          cardTitle:  { defaultValue: { language: "en-US", value: appName } },
          subheader:  { defaultValue: { language: "en-US", value: input.jobTitle ?? "Member" } },
          header:     { defaultValue: { language: "en-US", value: input.displayName } },
          barcode: { type: "QR_CODE", value: input.profileUrl, alternateText: input.profileUrl },
          textModulesData: [{ id: "profile_url", header: "PROFILE", body: input.profileUrl }],
          linksModuleData: {
            uris: [
              { uri: input.profileUrl, description: "View Profile", id: "profile_link" },
              { uri: baseUrl, description: appName, id: "app_link" },
            ],
          },
        },
      ],
    },
  };

  const token = jwt.sign(payload, sa.private_key, { algorithm: "RS256" });
  return { addToWalletUrl: `https://pay.google.com/gp/v/save/${token}` };
}
