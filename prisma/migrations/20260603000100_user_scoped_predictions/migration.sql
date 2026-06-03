-- Add optional ownership for predictions so existing rows remain readable
-- while new predictions can be scoped to the signed-in user.
ALTER TABLE "Prediction" ADD COLUMN "userId" INTEGER;

