-- CreateTable
CREATE TABLE "buyer_intake_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_intake_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_intake_submissions" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_intake_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buyer_intake_tokens_token_key" ON "buyer_intake_tokens"("token");

-- AddForeignKey
ALTER TABLE "buyer_intake_tokens" ADD CONSTRAINT "buyer_intake_tokens_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_intake_submissions" ADD CONSTRAINT "buyer_intake_submissions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "buyer_intake_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
