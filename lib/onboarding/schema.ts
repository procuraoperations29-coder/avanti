import { z } from 'zod';

/**
 * OnboardingState — the wizard's draft data, persisted in
 * driver_profiles.onboarding_state (jsonb).
 *
 * Every field optional so partial saves work at any step.
 * On submit, we validate the whole thing more strictly.
 */

const identitySchema = z.object({
  idKind: z.enum(['national_id', 'passport', 'drivers_licence']).optional(),
  idFrontDocumentId: z.string().uuid().optional(),
  idBackDocumentId: z.string().uuid().optional(),
  selfieDocumentId: z.string().uuid().optional(),
});

const licenceSchema = z.object({
  licenceFrontDocumentId: z.string().uuid().optional(),
  licenceBackDocumentId: z.string().uuid().optional(),
  licenceNumber: z.string().max(50).optional(),
  licenceExpiryDate: z.string().optional(),
});

const addressSchema = z.object({
  addressProofDocumentId: z.string().uuid().optional(),
  addressLine: z.string().max(300).optional(),
});

const backgroundSchema = z.object({
  consentGiven: z.boolean().optional(),
  consentGivenAt: z.string().optional(),
});

const experienceSchema = z.object({
  yearsExperience: z.number().int().min(0).max(60).optional(),
  languages: z.array(z.string()).optional(),
  vehicleClasses: z.array(z.string()).optional(),
  transmissionTypes: z.array(z.string()).optional(),
  bio: z.string().max(600).optional(),
  homeBaseAddress: z.string().max(200).optional(),
  homeBaseCity: z.string().max(100).optional(),
  serviceRadiusKm: z.number().int().min(1).max(500).optional(),
});

const payoutSchema = z.object({
  accountKind: z.enum(['bank_transfer', 'mobile_money']).optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(30).optional(),
  accountName: z.string().max(200).optional(),
  mobileMoneyProvider: z.string().max(50).optional(),
  msisdn: z.string().max(30).optional(),
});

export const onboardingStateSchema = z.object({
  currentStep: z.number().int().min(0).max(20).optional(),
  identity: identitySchema.optional(),
  licence: licenceSchema.optional(),
  address: addressSchema.optional(),
  background: backgroundSchema.optional(),
  experience: experienceSchema.optional(),
  payout: payoutSchema.optional(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

/**
 * Strict submission validation — used at the `/submit` endpoint to
 * confirm the driver actually completed each required step before
 * moving them to `submitted` status.
 */
export const submitReadinessSchema = z.object({
  identity: z.object({
    idFrontDocumentId: z.string().uuid(),
    selfieDocumentId: z.string().uuid(),
  }),
  licence: z.object({
    licenceFrontDocumentId: z.string().uuid(),
    licenceNumber: z.string().min(3),
  }),
  address: z.object({
    addressProofDocumentId: z.string().uuid(),
  }),
  background: z.object({
    consentGiven: z.literal(true),
  }),
  experience: z.object({
    yearsExperience: z.number().int().min(0),
    languages: z.array(z.string()).min(1),
    vehicleClasses: z.array(z.string()).min(1),
    transmissionTypes: z.array(z.string()).min(1),
  }),
  payout: z
    .object({
      accountKind: z.enum(['bank_transfer', 'mobile_money']),
    })
    .and(
      z.union([
        z.object({
          accountKind: z.literal('bank_transfer'),
          bankName: z.string().min(2),
          accountNumber: z.string().min(6),
          accountName: z.string().min(2),
        }),
        z.object({
          accountKind: z.literal('mobile_money'),
          mobileMoneyProvider: z.string().min(2),
          msisdn: z.string().min(6),
        }),
      ])
    ),
});
